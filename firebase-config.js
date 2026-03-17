// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCavLwZaWBRSvZK-X8YJPyty8zG7jq-H9M",
  authDomain: "pendientes-obra.firebaseapp.com",
  projectId: "pendientes-obra",
  storageBucket: "pendientes-obra.firebasestorage.app",
  messagingSenderId: "876724038271",
  appId: "1:876724038271:web:228a06b6610a6d57c5ad4a",
  measurementId: "G-RJCZJKNRLC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
