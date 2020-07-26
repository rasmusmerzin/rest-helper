import { elem, text, select, group, root, keepValue, saveValue } from "tyne";

const now = () => new Date().getTime();
const nowString = (milliseconds?: boolean) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}${
    milliseconds ? `.${ms}` : ""
  }`;
};

const currentTime = elem("code", {
  innerText: nowString(),
  style: {
    background: "var(--background)",
    textAlign: "center",
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    zIndex: 9,
  },
});

const targetUrl = <HTMLInputElement>elem("input", { type: "text" });
keepValue(targetUrl, "targetUrl");

const requestType = select(
  [
    "get",
    "head",
    "post",
    "put",
    "delete",
    "connect",
    "options",
    "trace",
    "patch",
  ],
  {
    style: { textTransform: "uppercase" },
  }
);
keepValue(requestType, "requestType");

const requestCredentials = select(["omit", "same-origin", "include"]);
keepValue(requestCredentials, "requestCredentials");

const requestBody = <HTMLTextAreaElement>(
  elem("textarea", { spellcheck: false })
);
keepValue(requestBody, "requestBody");

const requestBodyFormat = <HTMLInputElement>elem("input", { type: "checkbox" });
keepValue(requestBodyFormat, "requestBodyFormat", true, "checked");

const requestBodyEnabled = <HTMLInputElement>(
  elem("input", { type: "checkbox" })
);
keepValue(requestBodyEnabled, "requestBodyEnabled", false, "checked");

const requestBodyNote = elem("p", { className: "italic" });

const requestBodyMessage = elem("p", {
  className: "italic",
  innerHTML: "&nbsp;",
});

const sentAt = elem("code");
const recievedAt = elem("code");
const responseSent = elem("code");
const responseStatus = elem("code");

const response = <HTMLTextAreaElement>(
  elem("textarea", { readOnly: true, spellcheck: false })
);
const responseFormat = <HTMLInputElement>elem("input", { type: "checkbox" });
keepValue(responseFormat, "responseFormat", false, "checked");

const sendButton = <HTMLButtonElement>(
  elem("button", { className: "big", innerText: "SEND" })
);
const sendMessage = elem("p", { className: "italic", innerHTML: "&nbsp;" });

const tabSize = 2;
requestBody.addEventListener("keydown", (e) => {
  const current = requestBody.value;
  const start = requestBody.selectionStart,
    end = requestBody.selectionEnd;
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
        requestBody.value =
          prevRows + rowLeft.substring(0, rowLeft.length - amount) + right;
        requestBody.selectionStart = requestBody.selectionEnd = start - amount;
        saveValue(requestBody, "requestBody");
      }
      break;
    case "Tab":
      e.preventDefault();
      const amount = tabSize - ((rowLeft.length - 1) % tabSize);
      requestBody.value = left + " ".repeat(amount) + right;
      requestBody.selectionStart = requestBody.selectionEnd = start + amount;
      saveValue(requestBody, "requestBody");
      break;
  }
});

const formatBody = () => {
  try {
    let obj;
    try {
      obj = JSON.parse(requestBody.value);
    } catch (err) {
      if (requestBodyFormat.checked)
        obj = JSON.parse(
          requestBody.value
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
    if (obj && requestBodyFormat.checked) {
      requestBody.value = JSON.stringify(obj, null, tabSize);
      saveValue(requestBody, "requestBody");
    }
    requestBody.className = "";
    requestBodyMessage.innerHTML = "&nbsp;";
  } catch (err) {
    requestBody.className = "error";
    requestBodyMessage.innerText = String(err);
  }
};

requestBody.addEventListener("blur", formatBody);
requestBodyFormat.addEventListener(
  "change",
  () => requestBodyFormat.checked && formatBody()
);

const updateBodyEnabled = () => {
  requestBody.disabled = !requestBodyEnabled.checked;
};
updateBodyEnabled();
requestBodyEnabled.addEventListener("change", updateBodyEnabled);

sendButton.onclick = async () => {
  sendButton.disabled = true;
  sendMessage.innerHTML = "&nbsp;";
  response.value = "";
  responseStatus.innerText = "";
  sentAt.innerText = nowString(true);
  recievedAt.innerText = "";
  try {
    const res = await fetch(targetUrl.value, {
      method: requestType.value,
      credentials: <RequestCredentials>requestCredentials.value,
      ...(requestBodyEnabled.checked ? { body: requestBody.value } : {}),
    });
    recievedAt.innerText = nowString(true);
    responseStatus.innerText = String(res.status);
    try {
      const txt = await res.text();
      response.value = txt;
      try {
        const formatted = JSON.stringify(JSON.parse(txt), null, tabSize);
        if (formatted !== txt) {
          if (responseFormat.checked) {
            response.value = formatted;
          } else {
            responseFormat.onclick = () => {
              response.value = formatted;
              responseFormat.onclick = null;
            };
          }
        }
      } catch (_) {}
    } catch (err) {
      sendMessage.innerText = String(err);
    }
  } catch (err) {
    sendMessage.innerText = String(err);
  }
  sendButton.disabled = false;
};

setInterval(() => (currentTime.innerText = nowString()), 1000);

const updateRequestBodyNote = () => {
  if (requestBodyEnabled.checked) {
    switch (requestType.value) {
      case "get":
      case "head":
        requestBodyNote.innerHTML = `Note: According to <a href="https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Parameters">MDN web docs</a> GET or HEAD method cannot have a body.`;
        break;
      case "trace":
        requestBodyNote.innerHTML = `Note: According to <a href="https://tools.ietf.org/html/rfc2616#section-9.8">RFC2616</a> A TRACE request MUST NOT include an entity.`;
        break;
        break;
      default:
        requestBodyNote.innerText = "";
    }
  } else requestBodyNote.innerText = "";
};
updateRequestBodyNote();
requestType.addEventListener("change", updateRequestBodyNote);
requestBodyEnabled.addEventListener("change", updateRequestBodyNote);

root([
  currentTime,
  text("Request", "h2"),
  group([text("URL"), targetUrl]),
  group([text("Type"), requestType]),
  group([text("Credentials"), requestCredentials]),
  group([
    text("Body"),
    text(" Autoformat ", "i"),
    requestBodyFormat,
    text(" Enabled ", "i"),
    requestBodyEnabled,
    requestBody,
    requestBodyNote,
    requestBodyMessage,
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
  group([text("Content"), text(" Autoformat ", "i"), responseFormat, response]),
  group([sendMessage, sendButton], "center"),
]);
