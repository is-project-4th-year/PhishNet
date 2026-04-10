import { useState } from "react";
import axios from "axios";

export default function ScanTextSection() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);

  const handleScan = async () => {
    try {
      const res = await axios.post("http://localhost:8000/scan-text", { text });
      setResult(res.data);
    } catch (err) {
      console.error(err);
      setResult({ error: "Scan failed" });
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Scan Text or Web Page</h2>
      <textarea
        className="w-full p-3 border rounded mb-4"
        rows="5"
        placeholder="Paste text or URL here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        onClick={handleScan}
        className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
      >
        Scan
      </button>

      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-semibold">Result:</h3>
          <pre className="text-sm mt-2">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
