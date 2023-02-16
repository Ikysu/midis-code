import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifySensible from "@fastify/sensible";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import path from "path";
import * as url from "url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const cookieName = "midis_token";

const fastify = Fastify();
fastify.register(fastifyCors, {
  methods: ["POST", "GET", "OPTIONS", "DELETE"],
  origin: "*",
});

fastify.register(fastifyCookie, {
  secret: "cookie-secret",
  hook: "onRequest",
  parseOptions: {},
});

fastify.register(fastifySensible);

fastify.register(fastifyStatic, {
  root: path.join(__dirname, "midis-drive"),
  prefix: "/midis-drive",
  index: false,
  list: true,
});

fastify.register(fastifyStatic, {
  root: path.join(__dirname, "node_modules", "vscode-web"),
  prefix: "/vscode-web",
  decorateReply: false,
});

fastify.register(fastifyStatic, {
  root: path.join(__dirname, "static"),
  prefix: "/",
  decorateReply: false,
});

fastify.get("/auth", async (req, reply) => {
  const authResponse = await fetch(
    "https://portal.midis.info/auth/index.php?login=yes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `AUTH_FORM=Y&TYPE=AUTH&USER_LOGIN=${req.query.l}&USER_PASSWORD=${req.query.p}`,
      redirect: "manual",
    }
  );
  if (authResponse.ok) {
    const body = await authResponse.text();
    const Cookie = authResponse.headers.get("set-cookie")?.split(";")?.[0];
    //const signedParams = body.match(/signedParams:\s+?\'.+?\'/gm)?.[0]?.split("'")?.[1]
    const bitrix_sessid = body
      .match(/bitrix_sessid\'\:\'[0-9a-z]{32}\'/gm)?.[0]
      ?.split("'")?.[2];
    if (Cookie && bitrix_sessid) {
      reply
        .setCookie(
          cookieName,
          Buffer.from(JSON.stringify({ Cookie, bitrix_sessid })).toString(
            "base64"
          ),
          {
            path: "/",
            signed: true,
          }
        )
        .send({
          ok: true,
        });
    } else {
      throw fastify.httpErrors.forbidden("Ошибка авторизации");
    }
  } else {
    throw fastify.httpErrors.internalServerError("Портал не отвечает");
  }
});

function checkCookie(cookie) {
  if (cookie) {
    let result = fastify.unsignCookie(cookie);
    if (result.valid) {
      const { Cookie, bitrix_sessid } = JSON.parse(
        Buffer.from(result.value, "base64").toString("ascii")
      );
      return { Cookie, bitrix_sessid };
    } else {
      throw fastify.httpErrors.badRequest("Invalid cookie");
    }
  } else {
    throw fastify.httpErrors.badRequest("Cookie not found");
  }
}

fastify.get("/cookie", async (req, reply) => {
  checkCookie(req.cookies[cookieName]);
  return { ok: true };
});

fastify.get("/root", async (req, reply) => {
  const { Cookie, bitrix_sessid } = checkCookie(req.cookies[cookieName]);

  const diskResponse = await fetch(
    "https://portal.midis.info/company/personal/user/15393/disk/path/?IFRAME=Y&IFRAME_TYPE=SIDE_SLIDER",
    {
      headers: {
        Cookie: [Cookie],
      },
      redirect: "manual",
    }
  );
  if (diskResponse.ok) {
    const body = await diskResponse.text();
    const rootId = body
      .match(/rootObject.+\n.+?id:\s+?[0-9]+?\,/gm)?.[0]
      ?.split(",")?.[0]
      ?.split(" ")
      ?.at(-1);
    if (rootId) {
      reply.send({
        rootId: +rootId,
      });
    } else {
      throw fastify.httpErrors.internalServerError("Корневая папка недоступна");
    }
  } else {
    throw fastify.httpErrors.internalServerError("Портал не отвечает");
  }
});

// stat
fastify.post("/:method", async (req, reply) => {
  const { Cookie, bitrix_sessid } = checkCookie(req.cookies[cookieName]);
  let response = await fetch(
    `https://portal.midis.info/rest/${req.params.method}.json`,
    {
      method: "POST",
      headers: { Cookie, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        sessid: bitrix_sessid,
        ...req.body,
      }).toString(),
    }
  );
  reply.status(response.status).send(await response.json());
});

fastify.listen({
  host: "0.0.0.0",
  port: 5454,
});