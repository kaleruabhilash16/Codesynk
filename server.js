const WebSocket = require('ws');
const { exec } = require('child_process');
const fs = require('fs');

// Function to extract class name from the user's Java code
function getClassName(code) {
  const classNameMatch = code.match(/public\s+class\s+(\w+)/);
  return classNameMatch ? classNameMatch[1] : null;
}

// Create WebSocket server
const wss = new WebSocket.Server({ port: 8082 });

wss.on('connection', (ws) => {
  console.log('User connected');

  ws.on('message', (message) => {
    const { code, action, scannerInput } = JSON.parse(message); // Capture scannerInput

    if (action === 'updateCode') {
      // Broadcast updated code to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ code }));
        }
      });
    }

    if (action === 'executeCode') {
      const className = getClassName(code);
      if (!className) {
        ws.send(JSON.stringify({ output: 'Error: Could not determine class name' }));
        return;
      }

      const fileName = `${className}.java`;
      const inputFileName = 'input.txt'; // Temporary input file for Scanner input

      // Save the code to a dynamically named Java file
      fs.writeFile(fileName, code, (err) => {
        if (err) {
          ws.send(JSON.stringify({ output: 'Error writing Java file' }));
          return;
        }
        console.log(`Successfully wrote ${fileName}`);

        // Save scanner input to a temporary input file, if provided
        if (scannerInput) {
          fs.writeFile(inputFileName, scannerInput, (inputErr) => {
            if (inputErr) {
              ws.send(JSON.stringify({ output: 'Error writing input file' }));
              return;
            }

            // Compile the Java code
            exec(`javac ${fileName}`, (error, stdout, stderr) => {
              if (error || stderr) {
                ws.send(JSON.stringify({ output: `Compilation error: ${stderr}` }));
                return;
              }

              // Run the compiled Java class with input redirection
              exec(`java ${className} < ${inputFileName}`, (runError, runStdout, runStderr) => {
                if (runError || runStderr) {
                  ws.send(JSON.stringify({ output: `Runtime error: ${runStderr || runError.message}` }));
                } else {
                  ws.send(JSON.stringify({ output: runStdout }));
                }

                // Clean up temporary input file
                fs.unlink(inputFileName, (unlinkErr) => {
                  if (unlinkErr) {
                    console.error(`Error deleting input file: ${unlinkErr.message}`);
                  }
                });
              });
            });
          });
        } else {
          // If no Scanner input, just compile and run the Java code
          exec(`javac ${fileName}`, (error, stdout, stderr) => {
            if (error || stderr) {
              ws.send(JSON.stringify({ output: `Compilation error: ${stderr}` }));
              return;
            }

            // Run the compiled Java class
            exec(`java ${className}`, (runError, runStdout, runStderr) => {
              if (runError || runStderr) {
                ws.send(JSON.stringify({ output: `Runtime error: ${runStderr || runError.message}` }));
              } else {
                ws.send(JSON.stringify({ output: runStdout }));
              }
            });
          });
        }
      });
    }
  });

  ws.on('close', () => {
    console.log('User disconnected');
  });
});

console.log('WebSocket server running on ws://localhost:8081');
