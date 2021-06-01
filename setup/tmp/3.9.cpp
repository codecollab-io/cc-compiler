/**
 *  python3.9.cpp
 *  Modified Python Interpreter to import readline module before any execution
 *  and run a custom python REPL.
 *  
 *  Created by: Carl Voller
*/

#define PY_SSIZE_T_CLEAN
#include <python3.9/Python.h>
#include <iostream>

inline bool doesFileExist (const std::string& name) {
  struct stat buffer;   
  return (stat (name.c_str(), &buffer) == 0); 
}

// Customise the PS1.
void setPS1() {
    PyObject *ps1 = PyUnicode_FromString("\u001b[1;3;31m>> \u001b[0m");
    PySys_SetObject("ps1", ps1);
    Py_DECREF(ps1);
}

// Interactive mode.
void runInteractive(wchar_t *program) {
    PyObject *sys, *hook, *result;
    sys = PyImport_ImportModule("sys");

    if (sys == NULL) { std::cerr << "Unable to initialise sys interactive hook."; return; }

    hook = PyObject_GetAttrString(sys, "__interactivehook__");
    Py_DECREF(sys);

    if (hook == NULL) {
        PyErr_Clear();
        return;
    }

    result = _PyObject_CallNoArg(hook);
    Py_DECREF(hook);
    if (result == NULL) { std::cerr << "Unable to initialise sys interactive hook."; return; }
    Py_DECREF(result);

    setPS1();
    PyRun_InteractiveLoopFlags(stdin, "<stdin>", NULL);

    if (Py_FinalizeEx() < 0) {
        exit(120);
    }
    PyMem_RawFree(program);
}

int main(int argc, char *argv[]) {

    wchar_t *program = Py_DecodeLocale(argv[0], NULL);
    if (program == NULL) {
        fprintf(stderr, "Fatal error: cannot decode argv[0]\n");
        exit(1);
    }

    // Initialise Python Interpreter
    Py_SetProgramName(program);
    Py_Initialize();

    // Checks if a file was specified. Run interactive mode otherwise.
    if(argv[1] == NULL) {

        // Show the Python startup version and platform
        //std::cout << "Python " << Py_GetVersion() << " on " << Py_GetPlatform() << "\n";

        runInteractive(program);
        return 0;
    }

    // Handles non-existed files instead of showing a Segmentation Fault
    if(!doesFileExist(argv[1])) {
        std::cerr << "Can't open file '" << argv[1] << "': No such file or directory" << std::endl;
        exit(1);
    }

    // Disables buffering for input statements.
    PyRun_SimpleString("import readline");
    
    // Run the file
    PyRun_AnyFile(fopen(argv[1], "r"), argv[1]);

    if (Py_FinalizeEx() < 0) {
        exit(120);
    }
    PyMem_RawFree(program);

    return 0;
}