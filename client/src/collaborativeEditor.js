import React, { useState, useEffect } from "react";
import { Editor } from "@monaco-editor/react";
import "./CollaborativeEditor.css";
import { debounce } from "lodash";

const CollaborativeEditor = () => {
  const [code, setCode] = useState(""); // Holds the code in the editor
  const [output, setOutput] = useState(""); // Holds the output after execution
  const [loading, setLoading] = useState(false); // Indicates if the code is being compiled/executed
  const [socket, setSocket] = useState(null); // WebSocket connection
  const [scannerInput, setScannerInput] = useState(""); // Holds input for Scanner
  const [showScannerInput, setShowScannerInput] = useState(false); // Controls visibility of Scanner input field

  useEffect(() => {
    // Create WebSocket connection using secure wss://
    const ws = new WebSocket("wss://codesynk.onrender.com");
    // Update this with your server's URL
    setSocket(ws);

    ws.onmessage = (event) => {
      const { code, output } = JSON.parse(event.data);
      if (code) setCode(code);
      if (output) {
        setOutput(output);
        setLoading(false);
      }
    };

    return () => {
      ws.close(); // Cleanup the WebSocket connection on unmount
    };
  }, []);

  // Handle code changes in the editor
  const handleEditorChange = debounce((newValue) => {
    setCode(newValue);
    // Show or hide Scanner input field based on the code
    if (newValue.includes("Scanner")) {
      setShowScannerInput(true);
    } else {
      setShowScannerInput(false);
    }

    // Send updated code to the server
    if (socket) {
      socket.send(JSON.stringify({ code: newValue, action: "updateCode" }));
    }
  }, 300);

  // Handle code execution
  const handleExecuteCode = () => {
    if (socket) {
      setLoading(true);
      // Include Scanner input in the execution request
      socket.send(
        JSON.stringify({ code, scannerInput, action: "executeCode" })
      );
    }
  };

  // Handle changes in Scanner input field
  const handleInputChange = (e) => {
    setScannerInput(e.target.value);
  };

  return (
    <div className="editor-container">
      <h2 className="title">
        Collaborative Java Compiler/Editor with Autocomplete
      </h2>
      <Editor
        height="400px"
        language="java"
        theme="vs-dark"
        value={code}
        onChange={handleEditorChange}
        options={{
          automaticLayout: true,
          tabSize: 4,
          wordWrap: "on",
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          snippetSuggestions: "top",
        }}
      />
      {showScannerInput && (
        <div className="scanner-input-container">
          <label htmlFor="scanner-input">Enter input for Scanner:</label>
          <input
            type="text"
            id="scanner-input"
            value={scannerInput}
            onChange={handleInputChange}
            placeholder="Type input here..."
          />
        </div>
      )}
      <button
        className="run-button"
        onClick={handleExecuteCode}
        disabled={loading}
      >
        {loading ? "Compiling..." : "Run Code"}
      </button>
      {loading && <div className="loading">Compiling... Please wait</div>}
      <div className="output-container">
        <h3 className="output-title">Output:</h3>
        <pre className="output">{output}</pre>
      </div>
    </div>
  );
};

export default CollaborativeEditor;
