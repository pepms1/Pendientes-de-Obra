import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  addDoc,
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const statusEl = document.getElementById("status");
const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const activeList = document.getElementById("task-list");
const completedList = document.getElementById("completed-list");
const editActiveList = document.getElementById("edit-active-list");
const editCompletedList = document.getElementById("edit-completed-list");
const activeCount = document.getElementById("task-count");
const completedCount = document.getElementById("completed-count");
const template = document.getElementById("task-item-template");

let db;

const handleActionError = (error) => {
  const errorCode = error?.code || "desconocido";
  const errorMessage = error?.message || "Sin detalles";
  console.error(error);
  setStatus(buildSyncErrorStatus(errorCode, errorMessage), "status--error");
};

const hasPlaceholderConfig = (config) =>
  Object.values(config).some(
    (value) => typeof value === "string" && value.includes("REEMPLAZA_CON_")
  );

const formatDate = (timestamp) => {
  if (!timestamp) return "Sin fecha";
  const date = timestamp.toDate();
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const setStatus = (text, variant) => {
  statusEl.textContent = text;
  statusEl.classList.remove("status--ok", "status--error");
  if (variant) {
    statusEl.classList.add(variant);
  }
};

const getSyncErrorSuggestion = (code) => {
  switch (code) {
    case "permission-denied":
      return "Verifica permisos de Firebase o inicia sesión con una cuenta autorizada.";
    case "unavailable":
      return "Comprueba tu conexión a internet y vuelve a intentarlo.";
    case "failed-precondition":
      return "Revisa la configuración o índices de Firestore en Firebase.";
    default:
      return "Intenta recargar la página si el problema persiste.";
  }
};

const buildSyncErrorStatus = (code, message) => {
  const suggestion = getSyncErrorSuggestion(code);
  return `Error de sincronización: ${code}. ${suggestion} (${message})`;
};

const getInitErrorStatus = (code, message) => {
  switch (code) {
    case "auth/operation-not-allowed":
      return "Activa Anonymous en Firebase Authentication para permitir acceso con reglas autenticadas.";
    case "auth/unauthorized-domain":
      return "Agrega este dominio en Authentication > Settings > Authorized domains (ejemplo: localhost).";
    case "auth/invalid-api-key":
      return "La apiKey de firebase-config.js no es válida. Revisa y copia nuevamente el firebaseConfig.";
    case "auth/app-not-authorized":
      return "La app no está autorizada en Firebase. Verifica projectId, appId y dominio autorizado.";
    case "auth/network-request-failed":
      return "No se pudo conectar con Firebase. Revisa tu conexión a internet y vuelve a intentar.";
    default:
      return `Error de inicialización: ${code}. Revisa Firebase Config/Auth. (${message})`;
  }
};

const buildTaskItem = (docSnapshot, data, { showToggle, showDelete }) => {
  const fragment = template.content.cloneNode(true);
  const item = fragment.querySelector(".task");
  const toggle = fragment.querySelector(".task__toggle");
  const text = fragment.querySelector(".task__text");
  const meta = fragment.querySelector(".task__meta");
  const deleteButton = fragment.querySelector(".task__delete");

  text.textContent = data.text;
  meta.textContent = `Registrado: ${formatDate(data.createdAt)}`;
  toggle.checked = Boolean(data.completed);

  if (!showToggle) {
    toggle.disabled = true;
  } else {
    toggle.addEventListener("change", async () => {
      try {
        await updateDoc(doc(db, "pendientes", docSnapshot.id), {
          completed: toggle.checked,
        });
      } catch (error) {
        handleActionError(error);
      }
    });
  }

  if (data.completed) {
    item.classList.add("task--done");
  }

  if (showDelete) {
    deleteButton.addEventListener("click", async () => {
      try {
        await deleteDoc(doc(db, "pendientes", docSnapshot.id));
      } catch (error) {
        handleActionError(error);
      }
    });
  } else {
    deleteButton.remove();
  }

  return fragment;
};

const renderTasks = (snapshot) => {
  activeList.innerHTML = "";
  completedList.innerHTML = "";
  editActiveList.innerHTML = "";
  editCompletedList.innerHTML = "";

  let activeTotal = 0;
  let completedTotal = 0;

  snapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    const targetList = data.completed ? completedList : activeList;
    const editList = data.completed ? editCompletedList : editActiveList;

    if (data.completed) {
      completedTotal += 1;
    } else {
      activeTotal += 1;
    }

    targetList.appendChild(buildTaskItem(docSnapshot, data, { showToggle: true, showDelete: false }));
    editList.appendChild(buildTaskItem(docSnapshot, data, { showToggle: false, showDelete: true }));
  });

  activeCount.textContent = activeTotal.toString();
  completedCount.textContent = completedTotal.toString();
};

const init = async () => {
  try {
    if (!firebaseConfig || hasPlaceholderConfig(firebaseConfig)) {
      setStatus("Configura firebase-config.js con tus credenciales reales", "status--error");
      return;
    }

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    await signInAnonymously(auth);
    db = getFirestore(app);

    const pendientesRef = collection(db, "pendientes");
    const pendientesQuery = query(pendientesRef, orderBy("createdAt", "desc"));
    let hasReceivedFirstSnapshot = false;

    onSnapshot(pendientesQuery, (snapshot) => {
      renderTasks(snapshot);
      if (!hasReceivedFirstSnapshot) {
        hasReceivedFirstSnapshot = true;
        setStatus("Sincronizado", "status--ok");
      }
    }, handleActionError);
  } catch (error) {
    const errorCode = error?.code || "desconocido";
    const errorMessage = error?.message || "Sin detalles";
    console.error(error);
    if (error?.code === "auth/operation-not-allowed") {
      setStatus(
        "Activa Anonymous en Firebase Authentication para permitir acceso con reglas autenticadas.",
        "status--error"
      );
      return;
    }

    setStatus("Configura Firebase y Authentication", "status--error");
  }
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const value = input.value.trim();
  if (!value || !db) {
    return;
  }

  try {
    await addDoc(collection(db, "pendientes"), {
      text: value,
      completed: false,
      createdAt: serverTimestamp(),
    });

    input.value = "";
    input.focus();
  } catch (error) {
    handleActionError(error);
  }
});

init();
