const attachProps = (node, props) => {
  for (const key in props) {
    const val = props[key];
    if (
      val &&
      key === "_" &&
      typeof val === "object" &&
      val.length !== undefined
    ) {
      for (const child of val) node.appendChild(child);
    } else if (val && typeof val === "object" && val.length === undefined) {
      attachProps(node[key], val);
    } else node[key] = val;
  }
};

const elem = (type, props, parent) => {
  const node = document.createElement(type);
  if (props) attachProps(node, props);
  if (parent) parent.appendChild(node);
  return node;
};

const text = (content, type = "label", parent) =>
  elem(type, { innerHTML: content }, parent);
const group = (children, type = "div", parent) =>
  elem(type, { _: children }, parent);
const root = (children) => {
  for (const child of children) document.body.appendChild(child);
};

const keepValue = (node, key, init, prop = "value") => {
  const initVal = localStorage.getItem(key);
  if (initVal != undefined) {
    node[prop] = JSON.parse(initVal);
  } else if (init != undefined) {
    node[prop] = init;
  }
  node.addEventListener("input", () =>
    localStorage.setItem(key, JSON.stringify(node[prop]))
  );
};

const now = () => new Date().getTime();

//

const targetUrl = elem("input", {
  type: "text",
});
keepValue(targetUrl, "targetUrl");

const requestType = elem("select", {
  _: [
    elem("option", {
      value: "get",
      innerHTML: "GET",
    }),
    elem("option", {
      value: "post",
      innerHTML: "POST",
    }),
  ],
});
keepValue(requestType, "requestType");

const requestCredentials = elem("select", {
  _: [
    elem("option", {
      value: "omit",
      innerHTML: "omit",
    }),
    elem("option", {
      value: "same-origin",
      innerHTML: "same-origin",
    }),
    elem("option", {
      value: "include",
      innerHTML: "include",
    }),
  ],
});
keepValue(requestCredentials, "requestCredentials");

const postBody = elem("textarea", {
  spellcheck: false,
  disabled: requestType.value !== "post",
});
keepValue(postBody, "postBody");

const postBodyFormat = elem("input", { type: "checkbox" });
keepValue(postBodyFormat, "postBodyFormat", true, "checked");

const postBodyMessage = elem("p", { className: "italic", innerHTML: "&nbsp;" });

const response = elem("textarea", { readOnly: true, spellcheck: false });
const responsePretty = elem("button", {
  className: "clear",
  innerHTML: "PRETTIER",
  style: {
    visibility: "hidden",
    position: "absolute",
    right: "1.6rem",
    bottom: ".2rem",
  },
  onclick: () => (response.innerHTML = formatted),
});

const sendButton = elem("button", { className: "big", innerHTML: "SEND" });
const sendMessage = elem("p", { className: "italic", innerHTML: "&nbsp;" });

requestType.addEventListener(
  "change",
  () => (postBody.disabled = requestType.value !== "post")
);

const tabSize = 2;
postBody.addEventListener("keydown", (e) => {
  const current = postBody.value;
  const start = postBody.selectionStart,
    end = postBody.selectionEnd;
  const left = current.substring(0, start),
    right = current.substring(end);
  const rowLeft = String(left.match(/\n[^\n]*$/) || left);
  const prevRows = left.substring(0, left.length - rowLeft.length) || "";
  switch (e.key) {
    case "Backspace":
      if (rowLeft.length > 0) {
        e.preventDefault();
        let amount = 1;
        if (rowLeft.endsWith(" ".repeat(tabSize)))
          amount = (rowLeft.length % tabSize) + 1;
        postBody.value =
          prevRows + rowLeft.substring(0, rowLeft.length - amount) + right;
        postBody.selectionStart = postBody.selectionEnd = start - amount;
      }
      break;
    case "Tab":
      e.preventDefault();
      const amount = tabSize - ((rowLeft.length - 1) % tabSize);
      postBody.value = left + " ".repeat(amount) + right;
      postBody.selectionStart = postBody.selectionEnd = start + amount;
      break;
  }
});

const formatBody = () => {
  try {
    let obj;
    try {
      obj = JSON.parse(postBody.value);
    } catch (err) {
      if (postBodyFormat.checked)
        obj = JSON.parse(
          postBody.value
            .replace(/\n\s*([^"\n]*):/g, '\n"$1":')
            .replace(/:\s*'([^"\n]*[^,"\n])'(,?)\s*(\n|})/g, ': "$1"$2$3')
            .replace(
              /:\s*([^"\n]*\w[^"\n]*[^,"\n])(,?)\s*(\n|})/g,
              ': "$1"$2$3'
            )
            .replace(/,\s*}\s*$/, "}")
        );
      else throw err;
    }
    if (obj && postBodyFormat.checked)
      postBody.value = JSON.stringify(obj, null, tabSize);
    postBody.className = "";
    postBodyMessage.innerHTML = "&nbsp;";
  } catch (err) {
    postBody.className = "error";
    postBodyMessage.innerHTML = String(err);
  }
};
postBody.addEventListener("blur", formatBody);
postBodyFormat.addEventListener(
  "change",
  () => postBodyFormat.checked && formatBody()
);

sendButton.onclick = async () => {
  sendButton.disabled = true;
  sendMessage.innerHTML = "&nbsp;";
  response.innerHTML = "";
  responsePretty.style.visibility = "hidden";
  try {
    const res = await fetch(targetUrl.value, {
      method: requestType.value,
      credentials: requestCredentials.value,
      ...(requestType.value === "post" ? { body: postBody.value } : {}),
    });
    try {
      const txt = await res.text();
      response.innerHTML = txt;
      try {
        const formatted = JSON.stringify(JSON.parse(txt), null, tabSize);
        if (formatted !== txt) {
          responsePretty.onclick = () => {
            responsePretty.style.visibility = "hidden";
            response.innerHTML = formatted;
          };
          responsePretty.style.visibility = "visible";
        }
      } catch (_) {}
    } catch (err) {
      sendMessage.innerHTML = String(err);
    }
  } catch (err) {
    sendMessage.innerHTML = String(err);
  }
  sendButton.disabled = false;
};

root([
  text("Request", "h2"),
  group([text("URL"), targetUrl]),
  group([text("Type"), requestType]),
  group([text("Credentials"), requestCredentials]),
  group([
    text("Body"),
    text(" Autoformat ", "i"),
    postBodyFormat,
    postBody,
    postBodyMessage,
  ]),
  text("Response", "h2"),
  elem("div", {
    style: { position: "relative" },
    _: [text("Content"), response, responsePretty],
  }),
  elem("center", { _: [sendMessage, sendButton] }),
]);
