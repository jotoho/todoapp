/*
  SPDX-FileCopyrightText: 2024 Jonas Tobias Hopusch <git@jotoho.de>
  SPDX-License-Identifier: AGPL-3.0-only
*/
"use strict";

const getRandomNumber = async () => {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
};

class Todo {
  static COLLECTION = new Map();
  static async getUnusedTodoID() {
    for (
      let randomNumber = await getRandomNumber();
      true;
      randomNumber = await getRandomNumber()
    ) {
      if (!Todo.COLLECTION.has(randomNumber)) {
        return randomNumber;
      }
    }
  }

  constructor(
    title,
    id = null,
    description = "",
    duetime = null,
    isDone = false
  ) {
    if (typeof id === "number" || id === null) {
      this.id = id;
    } else {
      throw "Illegal Todo ID";
    }

    if (typeof title !== "string" || title.length < 1) {
      throw "Illegal parameter title for constructor of Todo";
    }
    this.title = title;

    if (typeof description !== "string") {
      throw "Illegal parameter title for constructor of Todo";
    }
    this.description = description;

    if (typeof duetime === "number" || duetime === null) {
      this.duetime = duetime;
    } else if (duetime instanceof Date) {
      this.duetime = duetime.getTime();
    } else if (typeof duetime === "string") {
      this.duetime = new Date(duetime).getTime();
    } else {
      throw "Illegal Parameter in parameter duetime of Todo constructor";
    }

    if (typeof isDone === "boolean") {
      this.isDone = isDone;
    } else {
      throw "isDone is not a boolean. Invalid argument.";
    }
  }
}

const editTodo = async (todo) => {
  document.getElementById("reset-todoform").click();
  document.getElementById("newtodo-id").value = todo.id;
  document.getElementById("newtodo-title").value = todo.title;
  document.getElementById("newtodo-description").value = todo.description;
  const dueDate = new Date(todo.duetime);
  dueDate.setMinutes(dueDate.getMinutes() - new Date().getTimezoneOffset());
  const dueDateStr = dueDate.toISOString();
  document.getElementById("newtodo-duetime").value = dueDateStr.slice(0, 16);
  document.getElementById("newtodo-isdone").checked = todo.isDone;
};

const removeTodo = async (todo, DOMElement) => {
  Todo.COLLECTION.delete(todo.id);
  DOMElement.remove();
  rebuildTODOList();
  if (document.getElementById("newtodo-id").value == todo.id) {
    document.getElementById("reset-todoform").click();
  }
};

const rebuildTODOList = async () => {
  const DOMTodoList = document.querySelector("#tasklist > tbody");

  for (const child of [...DOMTodoList.childNodes]) {
    DOMTodoList.removeChild(child);
  }

  for (const todo of Todo.COLLECTION.values()) {
    const row = document.createElement("tr");
    row.innerHTML = `
    <td class="todoid">${todo.id}</td>
    <td class="todotitle">${todo.title}</td>
    <td class="tododue">${
      todo.duetime !== null
        ? '<time datetime="' +
          todo.duetime +
          '">' +
          new Date(todo.duetime).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "medium",
          }) +
          "</time>"
        : "nie"
    }</td>
    <td class="tododone">${todo.isDone ? "✅" : "❌"}</td>
    <td class="tododescription">${todo.description}</td>
    <td><button class="editbutton" alt="bearbeiten">✏️</button></td>
    <td><button class="deletebutton" alt="löschen">🗑️</button></td>
    `;
    row
      .getElementsByClassName("editbutton")[0]
      .addEventListener("click", async () => editTodo(todo, row), {
        passive: true,
      });
    row
      .getElementsByClassName("deletebutton")[0]
      .addEventListener("click", async () => removeTodo(todo, row), {
        passive: true,
        once: true,
      });
    DOMTodoList.appendChild(row);
  }
};

const generateTestTODOS = async () => {
  const titles = [
    "Nonsense",
    "Gabbeldigoook",
    "Avada Kedavra!",
    "Google Pixel 8a",
  ];
  for (const title of titles) {
    const id = await Todo.getUnusedTodoID();
    Todo.COLLECTION.set(
      id,
      new Todo(
        title,
        id,
        "",
        Date.now() + Math.random() * (1000 * 60 * 60 * 24 * 365)
      )
    );
  }
  await rebuildTODOList();
};

const submissionListener = async () => {
  const idElementValue = document.getElementById("newtodo-id").value;
  const id =
    typeof (idElementValue === "string") && idElementValue
      ? Number.parseInt(idElementValue)
      : await Todo.getUnusedTodoID();
  const title = document.getElementById("newtodo-title").value;
  const description = document.getElementById("newtodo-description").value;
  const duetime = document.getElementById("newtodo-duetime").value || null;
  const taskDone = document.getElementById("newtodo-isdone").checked ?? false;

  Todo.COLLECTION.set(id, new Todo(title, id, description, duetime, taskDone));
  rebuildTODOList();
  document.getElementById("reset-todoform")?.click();
};

document.getElementById("newtodoform").addEventListener(
  "submit",
  (event) => {
    event.preventDefault();
    submissionListener();
  },
  {
    capture: true,
  }
);

generateTestTODOS();
