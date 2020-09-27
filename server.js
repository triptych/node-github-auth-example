import express from "express";
import fetch from "node-fetch";
import cookieSession from "cookie-session";

const app = express();
app.use(
  cookieSession({
    secret: process.env.COOKIE_SECRET,
  })
);

const client_id = process.env.GITHUB_CLIENT_ID;
const client_secret = process.env.GITHUB_CLIENT_SECRET;
console.log({ client_id, client_secret });

app.get("/", (req, res) => {
  res.send("Hello GitHub auth <a href='/login/github'>login</a>");
});

app.get("/login/github", (req, res) => {
  const redirect_uri = "http://localhost:9000/login/github/callback";
  res.redirect(
    `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${redirect_uri}&scope=gist`
  );
});

async function getAccessToken({ code, client_id, client_secret }) {
  const request = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id,
      client_secret,
      code,
    }),
  });
  const text = await request.text();
  const params = new URLSearchParams(text);
  return params.get("access_token");
}

async function fetchGitHubUser(token) {
  const request = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: "token " + token,
    },
  });
  return await request.json();
}

async function setGist(token) {
  // post and get response here
  const nDate = new Date();

  const request = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/vnd.github.v3+json",
      Authorization: "token " + token
    },
    body:JSON.stringify({
      "description": "a test gist!",
      "files": {
        "readme.txt": {
          "content": "Some stuff! please work! " + nDate.toDateString()
        },
        "somedata.json":{
          "content": "{fooo}"
        }
      },
      "public": true
    })
  });

  const text = await request.text();
  //const myjson = await request.json();
  console.log("text ::: ",text);
  //console.log("json :::", myjson);
  return text;
}

app.get("/login/github/callback", async (req, res) => {
  const code = req.query.code;
  const access_token = await getAccessToken({ code, client_id, client_secret });
  const user = await fetchGitHubUser(access_token);
  if (user) {
    req.session.access_token = access_token;
    req.session.githubId = user.id;
    res.redirect("/admin");
  } else {
    res.send("Login did not succeed!");
  }
});

app.get("/admin", async (req, res) => {
  console.log(req.session.githubId);
  if (req.session && req.session.githubId === 8691) {
    res.send(
      "Hello Andrew <a href='/gist'>gist</a> <pre>" +
        JSON.stringify(req.session, null, 2)
    );
    // Possible use "fetchGitHubUser" with the access_token
  } else {
    // res.redirect("/login/github");
    res.send("wrong users <a href='/logout'>Logout</a>");
  }
});

app.get("/logout", (req, res) => {
  if (req.session) req.session = null;
  res.redirect("/");
});

app.get("/gist", (req, res) => {
  res.send("let's make a gist! <a href='/makegist'>makegist</a>");
});

app.get("/makegist", async (req,res)=>{
  const mygist = await setGist(req.session.access_token);
  console.log("Mygist:", mygist );
  res.send("response: <pre>"+mygist);
})

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => console.log("Listening on localhost:" + PORT));
