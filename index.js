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

const targetUrl = elem("input", { value: localStorage.getItem("targetUrl") });
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
  disabled: requestType.value !== "post",
});
postBody.addEventListener("change", () =>
  localStorage.setItem("postBody", postBody.value)
);
const postBodyMessage = elem("p", { className: "italic", innerHTML: "&nbsp;" });

const response = elem("textarea", { readOnly: true });
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

postBody.addEventListener("blur", () => {
  try {
    let obj;
    try {
      obj = JSON.parse(postBody.value);
    } catch (_) {
      obj = JSON.parse(postBody.value.replace(/\s*([^"\n]*):/, '"$1":'));
    }
    if (obj) {
      postBody.value = JSON.stringify(obj, null, 2);
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
        const formatted = JSON.stringify(JSON.parse(txt), null, 2);
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
