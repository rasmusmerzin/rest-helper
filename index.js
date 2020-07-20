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

const now = () => new Date().getTime();

const targetUrl = elem("input", {
  type: "text",
  value: localStorage.getItem("targetUrl"),
});
targetUrl.addEventListener("change", () =>
  localStorage.setItem("targetUrl", targetUrl.value)
);

const reqTypeInitVal = localStorage.getItem("requestType");
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
  ...(reqTypeInitVal ? { value: reqTypeInitVal } : {}),
});
requestType.addEventListener("change", () =>
  localStorage.setItem("requestType", requestType.value)
);

const postBody = elem("textarea", {
  innerHTML: localStorage.getItem("postBody") || "{\n\n}",
  spellcheck: false,
  disabled: requestType.value !== "post",
});
const postBodyMessage = elem("p", { className: "italic", innerHTML: "&nbsp;" });

const response = elem("textarea", { readOnly: true, spellcheck: false });
const responsePretty = elem("button", {
  className: "clear",
  innerHTML: "PRETTIER",
  style: {
    margin: ".4rem .2rem",
    visibility: "hidden",
    position: "absolute",
    right: 0,
    bottom: 0,
  },
  onclick: () => (response.innerHTML = formatted),
});

const sendButton = elem("button", { className: "big", innerHTML: "SEND" });
const sendMessage = elem("p", { className: "italic", innerHTML: "&nbsp;" });

elem(
  "div",
  {
    _: [
      elem("div", {
        _: [elem("label", { innerHTML: "Request URL:" }), targetUrl],
      }),
      elem("div", {
        _: [elem("label", { innerHTML: "Request Type:" }), requestType],
      }),
      elem("div", {
        _: [
          elem("label", { innerHTML: "Post Body:" }),
          postBody,
          postBodyMessage,
        ],
      }),
      elem("div", {
        style: { position: "relative" },
        _: [
          elem("label", { innerHTML: "Response:" }),
          response,
          responsePretty,
        ],
      }),
      elem("center", { _: [sendMessage, sendButton] }),
    ],
  },
  document.body
);

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
  localStorage.setItem("postBody", postBody.value);
});

postBody.addEventListener("blur", () => {
  try {
    let obj;
    try {
      obj = JSON.parse(postBody.value);
    } catch (_) {
      obj = JSON.parse(
        postBody.value
          .replace(/\n\s*([^"\n]*):/g, '\n"$1":')
          .replace(/:\s*'([^"\n]*[^,"\n])'(,?)\s*(\n|})/g, ': "$1"$2$3')
          .replace(/:\s*([^"\n]*\w[^"\n]*[^,"\n])(,?)\s*(\n|})/g, ': "$1"$2$3')
          .replace(/,\s*}\s*$/, "}")
      );
    }
    if (obj) {
      postBody.value = JSON.stringify(obj, null, tabSize);
      localStorage.setItem("postBody", postBody.value);
    }
    postBody.className = "";
    postBodyMessage.innerHTML = "&nbsp;";
  } catch (err) {
    postBody.className = "error";
    postBodyMessage.innerHTML = String(err);
  }
});

sendButton.onclick = async () => {
  sendButton.disabled = true;
  sendMessage.innerHTML = "&nbsp;";
  response.innerHTML = "";
  responsePretty.style.visibility = "hidden";
  try {
    const res = await fetch(targetUrl.value, {
      method: requestType.value,
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
