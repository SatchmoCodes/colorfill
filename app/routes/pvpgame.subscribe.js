import { emitter } from "~/services/emitter.server";
import { eventStream } from "remix-utils";

export function loader({ request }) {
  return eventStream(request.signal, function setup(send) {
    function handle(value) {
      send({ event: "updateBoard-gameSession", data: value});
    }

    emitter.on("updateBoard-gameSession", handle);

    return function clear() {
      emitter.off("updateBoard-gameSession", handle);
    };
  });
}