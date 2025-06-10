import { Button } from "@/components/ui/button";
import { FirestoreExample } from "./firestore";

function App() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center">
      <Button>Click me</Button>
      <FirestoreExample />
    </div>
  );
}

export default App;
