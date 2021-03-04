/**
 *  python3.9.cpp
 *  Modified Python Interpreter to import readline module before any execution.
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

int main(int argc, char *argv[]) {

    // Checks if a file was even specified
    if(argv[1] == NULL) {
        std::cerr << "No file specified." << std::endl;
        exit(1);
    }

    // Handles non-existed files instead of showing a Segmentation Fault
    if(!doesFileExist(argv[1])) {
        std::cerr << "Can't open file '" << argv[1] << "': No such file or directory" << std::endl;
        exit(1);
    }

    wchar_t *program = Py_DecodeLocale(argv[0], NULL);
    if (program == NULL) {
        fprintf(stderr, "Fatal error: cannot decode argv[0]\n");
        exit(1);
    }

    // Initialise Python Interpreter
    Py_SetProgramName(program);
    Py_Initialize();

    PyRun_SimpleString("import readline");

    FILE *file = fopen(argv[1], "r");
    
    PyRun_AnyFile(file, argv[1]);
    
    if (Py_FinalizeEx() < 0) {
        exit(120);
    }
    PyMem_RawFree(program);
    return 0;
}