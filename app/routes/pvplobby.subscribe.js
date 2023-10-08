import { emitter } from "~/services/emitter.server";
import { eventStream } from "remix-utils";

export function loader({ request }) {
  return eventStream(request.signal, function setup(send) {
    function handle(value) {
      send({ event: "edit-gameSession", data: value});
    }

    emitter.on("edit-gameSession", handle);

    return function clear() {
      emitter.off("edit-gameSession", handle);
    };
  });
}