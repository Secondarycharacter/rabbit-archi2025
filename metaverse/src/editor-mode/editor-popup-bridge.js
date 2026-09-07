const RPC_CHANNEL = "metaverse-editor-rpc";
const UI_CHANNEL = "metaverse-editor-ui";

export function installEditorPopupRpcBridge(handlers = {}) {
  window.addEventListener("message", async (event) => {
    if (event.origin !== window.location.origin) {
      return;
    }

    if (event.data?.channel !== RPC_CHANNEL) {
      return;
    }

    const { id, method, args = [] } = event.data;
    let result = null;
    let error = null;

    try {
      const handler = handlers[method];

      if (typeof handler !== "function") {
        throw new Error(`Unknown editor RPC: ${method}`);
      }

      result = await handler(...args);
    } catch (rpcError) {
      error = String(rpcError?.message || rpcError);
    }

    event.source?.postMessage({
      channel: RPC_CHANNEL,
      id,
      result,
      error
    }, event.origin);
  });
}

export function createOpenerRpc() {
  return {
    call(method, ...args) {
      if (!window.opener || window.opener.closed) {
        return Promise.reject(new Error("메타버스 창이 닫혔습니다."));
      }

      return new Promise((resolve, reject) => {
        const id = crypto.randomUUID();

        const onMessage = (event) => {
          if (event.origin !== window.location.origin) {
            return;
          }

          if (event.data?.channel !== RPC_CHANNEL || event.data.id !== id) {
            return;
          }

          window.removeEventListener("message", onMessage);

          if (event.data.error) {
            reject(new Error(event.data.error));
            return;
          }

          resolve(event.data.result);
        };

        window.addEventListener("message", onMessage);
        window.opener.postMessage({
          channel: RPC_CHANNEL,
          id,
          method,
          args
        }, window.location.origin);

        window.setTimeout(() => {
          window.removeEventListener("message", onMessage);
          reject(new Error("메타버스 창 응답 시간 초과"));
        }, 15000);
      });
    }
  };
}

export function postPopupUiCommand(popupWindow, action, payload = {}) {
  popupWindow?.postMessage?.({
    channel: UI_CHANNEL,
    action,
    ...payload
  }, window.location.origin);
}

export function listenPopupUiCommands(onCommand) {
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) {
      return;
    }

    if (event.data?.channel !== UI_CHANNEL) {
      return;
    }

    onCommand?.(event.data);
  });
}
