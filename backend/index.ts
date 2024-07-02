import express from "express";
import { param, body, header, validationResult } from "express-validator";
import type { ValidationChain } from "express-validator";
import swaggerUI from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import type { Todo } from "./todoapp.ts";
import DB from "./db.ts";
import { bigIntReplacer, bigIntReviver } from "./bigint-json.ts";

const database = new DB();

type CONFIG_TYPE = Readonly<{
  PORT: number;
  SWAGGER_OPTIONS: Readonly<swaggerJSDoc.Options>;
}>;

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
app.use(express.json({
  reviver: bigIntReviver
}));
const swaggerDocs = swaggerJSDoc(CONFIG.SWAGGER_OPTIONS);
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocs));

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
  // body("_id").notEmpty(),
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
  const data = await database.queryAll();
  res.type("application/json");
  res.send(JSON.stringify(data, bigIntReplacer));
});

type ProtoTodo = {
  _id?: BigInt | number | null;
  title?: string;
  description?: string;
  duetime?: number | null;
  isDone?: boolean;
};

const normalizeTodo = async (protoTodo: ProtoTodo): Promise<Todo> => {
  const sanitizedTodo: ProtoTodo = {
    title: protoTodo.title ?? "TITLE MISSING - THIS IS A BUG",
    description: protoTodo.description ?? "",
    duetime: protoTodo.duetime === undefined ? null : protoTodo.duetime,
    isDone: protoTodo.isDone === undefined ? false : protoTodo.isDone,
  };
  if (Object.hasOwn(protoTodo, "_id") && protoTodo._id) {
    if (protoTodo._id instanceof BigInt) {
      sanitizedTodo._id = protoTodo._id;
    }
    else if (typeof(protoTodo._id) === "number") {
      sanitizedTodo._id = BigInt(protoTodo._id);
    }
  }
  return sanitizedTodo as Todo;
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
  const newTodo: Todo = await normalizeTodo(req.body);
  database.insert(newTodo).then(insertedObj => {
    res
      .status(201)
      .type("application/json")
      .send(JSON.stringify(insertedObj, bigIntReplacer));
  }).catch(err => {
    res.status(500).send();
    console.error(err);
  })
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
  const id = BigInt(req.params.id);
  const todo = database.queryById(id);
  if (todo) {
    res.type("application/json").send(JSON.stringify(todo, bigIntReplacer));
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
  const id = BigInt(req.params?.id);

  database
    .update(id, await normalizeTodo(req.body))
    .then((newlyUpdatedTodo) => {
      if (newlyUpdatedTodo !== null) {
        res.status(200).type("application/json").send(JSON.stringify(newlyUpdatedTodo, bigIntReplacer));
      } else {
        res.status(404).send();
      }
    })
    .catch((error) => {
      res.status(500).send();
      console.error(error);
    });
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
  const id = BigInt(req.params?.id);
  database
    .delete(id)
    .then(() => {
      res.status(204).send();
    })
    .catch((err) => {
      res.status(500).send();
      console.error(err);
    });
});

const loadDummyEntries = async () => {
  const dummies: ProtoTodo[] = [
    {
      _id: 1671056616571,
      title: "Übung 4 machen",
      description: "",
      duetime: new Date("2022-11-12T00:00:00.000Z").getTime(),
      isDone: false,
    },
    {
      _id: 1671087245763,
      title: "Für die Klausur Webentwicklung lernen",
      description: "",
      duetime: new Date("2023-01-14T00:00:00.000Z").getTime(),
      isDone: true,
    },
    {
      _id: 1671087245764,
      title: "Einen Kuchen backen",
      description: "",
      duetime: new Date("2023-01-14T00:00:00.000Z").getTime(),
      isDone: false,
    },
  ];
  for (const dummyPromise of dummies.map(normalizeTodo)) {
    const entryToInsert = await dummyPromise;
    if (await database.count(entryToInsert._id).catch(() => {}) === 0) {
      database.insert(entryToInsert).catch(() => {});
    }
  }
};

database.waitUntilReady().then(() => {
  loadDummyEntries();
  app.listen(CONFIG.PORT);
});
