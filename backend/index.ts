import express from "express";
import { param, body, header, validationResult } from "express-validator";
import type { ValidationChain } from "express-validator";

const CONFIG = Object.freeze({
  PORT: 3000,
});

const app = express();
app.use(express.json());

let TODOS = [
  {
    _id: 1671056616571,
    title: "Übung 4 machen",
    duetime: new Date("2022-11-12T00:00:00.000Z").getTime(),
    isDone: false,
  },
  {
    _id: 1671087245763,
    title: "Für die Klausur Webentwicklung lernen",
    duetime: new Date("2023-01-14T00:00:00.000Z").getTime(),
    isDone: true,
  },
  {
    _id: 1671087245764,
    title: "Einen Kuchen backen",
    duetime: new Date("2023-01-14T00:00:00.000Z").getTime(),
    isDone: false,
  },
];

const todoValidationNew: readonly ValidationChain[] = [
  body("_id").not().exists(),
  body("title").notEmpty().isString(),
  body("description").optional().isString(),
  body("duetime")
    .optional()
    .isInt()
    .custom((val) => val > 0),
  body("isDone").optional().isBoolean(),
  header("content-type").matches("application/json"),
];

const todoValidationChange: readonly ValidationChain[] = [
  body("_id")
    .notEmpty()
    .isInt()
    .custom((val) => val > 0)
    .custom((val) => TODOS.some((todo) => todo._id === val)),
  body("title").notEmpty().isString(),
  body("description").optional().isString(),
  body("duetime")
    .optional()
    .custom((val) => val === null || (typeof val === "number" && val > 0)),
  body("isDone").optional().isBoolean(),
  header("content-type").matches("application/json; charset=utf-8"),
];

app.get("/todos", async (req, res) => {
  res.json(TODOS);
});

const generateUnusedID = async () => {
  let randomNum = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  while (TODOS.some((todo) => todo._id === randomNum)) {
    randomNum = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  }
  return randomNum;
};

app.post("/todos", ...todoValidationNew, async (req, res) => {
  const validationErrors = validationResult(req).array();
  if (validationErrors.length > 0) {
    res.status(400).json(validationErrors);
    return;
  }
  const newTodo = req.body;
  newTodo._id = await generateUnusedID();
  TODOS.push(newTodo);
  res.status(201).json(newTodo);
});

app.get("/todos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const todo = TODOS.find((todo) => todo._id === id);
  if (todo) {
    res.json(todo);
  } else {
    res.status(404).send();
  }
});

app.put("/todos/:id", ...todoValidationChange, async (req, res) => {
  const validationErrors = validationResult(req).array();
  if (validationErrors.length > 0) {
    res.status(400).json(validationErrors);
    return;
  }
  const id = parseInt(req.params?.id);
  if (id !== req.body._id) {
    console.error("ID mismatch", id, req.body._id);
    res.status(400).send("ID mismatch between URI and JSON");
  }
  for (let index = 0; index < TODOS.length; index++) {
    if (TODOS[index]._id === id) {
      TODOS[index] = req.body;
      console.debug(req.body);
      res.status(200).send(TODOS[index]);
      return;
    }
  }

  res.status(404).send();
});

app.delete("/todos/:id", param("id").isInt(), async (req, res) => {
  const validationErrors = validationResult(req).array();
  if (validationErrors.length > 0) {
    res.status(400).json(validationErrors);
    return;
  }
  const id = Number.parseInt(req.params?.id);
  TODOS = TODOS.filter((todo) => todo._id !== id);
  res.status(204).send();
});

app.listen(CONFIG.PORT);
