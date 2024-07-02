import express from "express";
import { param, body, header, validationResult } from "express-validator";
import type { ValidationChain } from "express-validator";
import swaggerUI from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";

type CONFIG_TYPE = {
  PORT: number;
  SWAGGER_OPTIONS: Readonly<swaggerJSDoc.Options>;
};

const CONFIG: CONFIG_TYPE = Object.freeze({
  PORT: 3000,
  SWAGGER_OPTIONS: Object.freeze({
    swaggerDefinition: {
      openapi: "3.1.0",
      info: {
        title: "Todo API",
        version: "1.0.0",
        description: "Todo API Dokumentation",
      },
      servers: [
        {
          url: "http://localhost:3000",
        },
      ],
      components: {
        schemas: {
          todonew: {
            type: "object",
            properties: {
              title: {
                type: "string",
                minLength: 1,
              },
              description: {
                type: "string",
              },
              duetime: {
                type: "integer",
                format: "int64",
                minimum: 0,
              },
              isDone: {
                type: "boolean",
              },
            },
            required: ["title"],
          },
          todoupdate: {
            type: "object",
            properties: {
              _id: {
                type: "integer",
                format: "int64",
              },
              title: {
                type: "string",
                minLength: 1,
              },
              description: {
                type: "string",
              },
              duetime: {
                type: "integer",
                format: "int64",
                minimum: 0,
              },
              isDone: {
                type: "boolean",
              },
            },
            required: ["_id", "title"],
          },
        },
      },
    },
    apis: ["./index.ts"],
  }),
});

const app = express();
app.use(express.json());
const swaggerDocs = swaggerJSDoc(CONFIG.SWAGGER_OPTIONS);
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocs));

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
  header("Content-Type").matches(
    new RegExp("^application/json(; charset=utf-8)?$")
  ),
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
  header("Content-Type").matches(
    new RegExp("^application/json(; charset=utf-8)?$")
  ),
];

/**
 * @openapi
 * /todos:
 *   summary: "allows interacting with the collection of all todos"
 *   get:
 *     summary: "Retrieve all todos"
 *     responses:
 *       200:
 *         description: "All known todos"
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/todoupdate'
 */
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

/**
 * @openapi
 * /todos:
 *   post:
 *     summary: "Submit a new todo"
 *     parameters:
 *      - name: Content-Type
 *        in: header
 *        required: true
 *        schema:
 *          type: string
 *          enum: ["application/json", "application/json; charset=utf-8"]
 *     requestBody:
 *       content:
 *         "application/json":
 *           schema:
 *             $ref: '#/components/schemas/todonew'
 *         "application/json; charset=utf-8":
 *           schema:
 *             $ref: '#/components/schemas/todonew'
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/todoupdate'
 */
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

/**
 * @openapi
 * "/todos/{id}":
 *   summary: "interact with a specific todo"
 *   get:
 *     summary: "Retrieve a specific todo"
 *     parameters:
 *      - name: "id"
 *        in: "path"
 *        required: true
 *        schema:
 *          type: "integer"
 *          format: "int64"
 *     responses:
 *       200:
 *         description: "The todo"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/todoupdate'
 *       404:
 *         description: "Todo not found"
 */
app.get("/todos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const todo = TODOS.find((todo) => todo._id === id);
  if (todo) {
    res.json(todo);
  } else {
    res.status(404).send();
  }
});

/**
 * @openapi
 * "/todos/{id}":
 *   summary: "interact with a specific todo"
 *   put:
 *     summary: "Update a specific todo"
 *     parameters:
 *      - name: "id"
 *        in: "path"
 *        required: true
 *        schema:
 *          type: "integer"
 *          format: "int64"
 *      - name: Content-Type
 *        in: header
 *        required: true
 *        schema:
 *          type: string
 *          enum: ["application/json", "application/json; charset=utf-8"]
 *     requestBody:
 *       content:
 *         "application/json":
 *           schema:
 *             $ref: '#/components/schemas/todoupdate'
 *         "application/json; charset=utf-8":
 *           schema:
 *             $ref: '#/components/schemas/todoupdate'
 *     responses:
 *       200:
 *         description: "The todo"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/todoupdate'
 *       404:
 *         description: "No known todo with that ID"
 */
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

/**
 * @openapi
 * "/todos/{id}":
 *   summary: "interact with a specific todo"
 *   delete:
 *     summary: "Delete a specific todo"
 *     parameters:
 *      - name: "id"
 *        in: "path"
 *        required: true
 *        schema:
 *          type: "integer"
 *          format: "int64"
 *     responses:
 *       204:
 *         description: "No Content"
 */
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
