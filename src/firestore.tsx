import { useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  addDoc,
  getDocs,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";

const firebaseConfig = {
  apiKey: "AIzaSyB7fS8VSOUOTjKXEeJwzkXQrEueVvtT16Q",
  authDomain: "chickentinder-1.firebaseapp.com",
  projectId: "chickentinder-1",
  storageBucket: "chickentinder-1.firebasestorage.app",
  messagingSenderId: "867949024514",
  appId: "1:867949024514:web:8d35685adc76d3b7fade1b",
  measurementId: "G-VH8S787WP3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

if (window.location.hostname === "localhost") {
  connectFirestoreEmulator(db, "localhost", 8080);
}

export function FirestoreExample({ name }: { name: string }) {
  const addUser = async () => {
    if (!name.trim()) {
      alert("Please enter a name first.");
      return;
    }

    const docRef = await addDoc(collection(db, "users"), {
      first: name,
      last: "Lovelace",
      born: 1815,
    });
    console.log("Document written with ID: ", docRef.id);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      const querySnapshot = await getDocs(collection(db, "users"));
      querySnapshot.forEach((doc) => {
        console.log(`${doc.id} =>`, doc.data());
      });
    };
    fetchUsers();
  }, []);

  return (
    <div>
      <Button onClick={addUser}>Add User</Button>
    </div>
  );
}
