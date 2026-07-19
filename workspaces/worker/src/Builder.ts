import { Container } from "@cloudflare/containers";

export class Builder extends Container {
  defaultPort = 8080;
  sleepAfter = "10s";
  envVars = {};

  override onStart() {
    console.log("Container successfully started");
  }

  override onStop() {
    console.log("Container successfully shut down");
  }

  override onError(error: unknown) {
    console.log("Container error:", error);
  }
}
