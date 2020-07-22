import { elem, text, group, root, keepValue } from "tyne";

const now = () => new Date().getTime();
const nowString = (milliseconds) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, 0);
  const day = String(date.getDate()).padStart(2, 0);
  const hour = String(date.getHours()).padStart(2, 0);
  const minute = String(date.getMinutes()).padStart(2, 0);
  const second = String(date.getSeconds()).padStart(2, 0);
  const ms = String(date.getMilliseconds()).padStart(3, 0);
  return `${year}-${month}-${day} ${hour}:${minute}:${second}${
    milliseconds ? `.${ms}` : ""
  }`;
};

const currentTime = elem("code", {
  innerHTML: nowString(),
  style: { display: "block", textAlign: "center" },
});

const targetUrl = elem("input", {
  type: "text",
});
keepValue(targetUrl, "targetUrl");

const requestType = elem("select", {
  children: [
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
  children: [
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

const sentAt = elem("code");
const recievedAt = elem("code");
const responseSent = elem("code");
const responseStatus = elem("code");
const response = elem("textarea", { readOnly: true, spellcheck: false });
const responsePretty = elem("button", {
  className: "clear",
  innerHTML: "PRETTIER",
  style: {
    visibility: "hidden",
    position: "absolute",
    right: "1.6rem",
    lineHeight: 0,
    bottom: ".8rem",
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
  responseStatus.innerHTML = "";
  responsePretty.style.visibility = "hidden";
  sentAt.innerHTML = nowString(1);
  recievedAt.innerHTML = "";
  try {
    const res = await fetch(targetUrl.value, {
      method: requestType.value,
      credentials: requestCredentials.value,
      ...(requestType.value === "post" ? { body: postBody.value } : {}),
    });
    recievedAt.innerHTML = nowString(1);
    responseStatus.innerHTML = res.status;
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

setInterval(() => (currentTime.innerHTML = nowString()), 1000);

root([
  currentTime,
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
    style: {
      display: "grid",
      gridTemplateColumns: "auto 1fr",
      alignItems: "center",
    },
    children: [
      text("Sent"),
      sentAt,
      text("Recieved"),
      recievedAt,
      text("Status"),
      responseStatus,
    ],
  }),
  elem("div", {
    style: { position: "relative" },
    children: [text("Content"), response, responsePretty],
  }),
  group([sendMessage, sendButton], "center"),
]);
