// Production server with TLS, so phone cameras can use the scan page.
// `next start` only supports HTTPS in dev (--experimental-https), so this
// wraps the production handler in Node's https server with the mkcert certs.
import { createServer } from "node:https";
import { readFileSync } from "node:fs";
import next from "next";

const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev: false });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: readFileSync("certificates/localhost-key.pem"),
  cert: readFileSync("certificates/localhost.pem"),
};

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    handle(req, res);
  }).listen(port, () => {
    console.log(`> Production server listening at https://localhost:${port}`);
  });
});
