import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FirestoreExample } from "./firestore";

function App() {
  const [name, setName] = useState("");

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <Button>Click me</Button>
      <input
        id="name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border p-2"
        placeholder="Enter your name"
      />
      <FirestoreExample name={name} />
    </div>
  );
}

export default App;
