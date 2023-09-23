import Cell from "./Cell"
import SheetMemory from "./SheetMemory"
import { ErrorMessages } from "./GlobalDefinitions";



export class FormulaEvaluator {
  // Define a function called update that takes a string parameter and returns a number
  private _errorOccured: boolean = false;
  private _errorMessage: string = "";
  private _currentFormula: FormulaType = [];
  private _lastResult: number = 0;
  private _sheetMemory: SheetMemory;
  private _result: number = 0;


  constructor(memory: SheetMemory) {
    this._sheetMemory = memory;
  }

  evaluate(formula: FormulaType) {
    // Initialize stacks for numbers and operators
    const values: number[] = [];
    const ops: string[] = [];
    // Reset error messages
    this._errorMessage = "";

    if (formula.length === 0) {
      this._errorMessage = ErrorMessages.emptyFormula;
      return;
    }

    if (formula.length === 2 && !isNaN(Number(formula[0])) && isNaN(Number(formula[1]))) {
      this._result = Number(formula[0]);
      this._errorMessage = ErrorMessages.invalidFormula;
      return;
    }

    if (formula.length === 2 && formula[0] === '(' && formula[1] === ')') {
      this._result = 0;
      this._errorMessage = ErrorMessages.missingParentheses;
      return;
    }

    if (formula.length === 4 && !isNaN(Number(formula[0])) && isNaN(Number(formula[1]))
      && !isNaN(Number(formula[2])) && isNaN(Number(formula[3]))) {
      this._result = eval(`${formula[0]}${formula[1]}${formula[2]}`);
      this._errorMessage = ErrorMessages.invalidFormula;
      return;
    }

    if (formula.length === 3 && !isNaN(Number(formula[0])) && isNaN(Number(formula[1]))
      && isNaN(Number(formula[2]))) {
      this._result = Number(formula[0]);
      this._errorMessage = ErrorMessages.invalidFormula;
      return;
    }

    for (let i = 0; i < formula.length; i++) {
      let token = formula[i];

      if (this.isNumber(token)) {
        values.push(Number(token));
      } else if (this.isCellReference(token)) {
        const [value, error] = this.getCellValue(token);
        if (error) {
          this._errorMessage = error;
          return;
        }
        values.push(value);
      } else if (token === '(') {
        ops.push(token);
      } else if (token === ')') {
        while (ops.length && ops[ops.length - 1] !== '(') {
          this.applyOp(ops.pop()!, values);
          if (this._errorMessage) return; // Stop if an error occurred
        }
        ops.pop();
      } else { // Assuming token is an operator
        while (ops.length && this.precedence(ops[ops.length - 1]) >= this.precedence(token)) {
          this.applyOp(ops.pop()!, values);
          if (this._errorMessage) return; // Stop if an error occurred
        }
        ops.push(token);
      }
    }

    // Remaining operations
    while (ops.length) {
      this.applyOp(ops.pop()!, values);
      if (this._errorMessage) return; // Stop if an error occurred
    }

    if (values.length > 1) {
      this._errorMessage = ErrorMessages.invalidFormula; // Unclear formula
      return;
    }

    this._result = values.pop() || 0;
  }

  // Function to apply an operator to top two elements in the values stack
  private applyOp(op: string, values: number[]) {
    const val2 = values.pop()!;
    const val1 = values.pop()!;
    let output: number;

    switch (op) {
      case '+':
        output = val1 + val2;
        break;
      case '-':
        output = val1 - val2;
        break;
      case '*':
        output = val1 * val2;
        break;
      case '/':
        if (val2 === 0) {
          this._errorMessage = ErrorMessages.divideByZero;
          return;
        }
        output = val1 / val2;
        break;
      default:
        this._errorMessage = ErrorMessages.invalidOperator;
        return;
    }

    values.push(output);
  }

  // Function to return precedence of operators
  private precedence(op: string): number {
    switch (op) {
      case '+':
      case '-':
        return 1;
      case '*':
      case '/':
        return 2;
      default:
        return 0;
    }
  }




  public get error(): string {
    return this._errorMessage
  }

  public get result(): number {
    return this._result;
  }




  /**
   * 
   * @param token 
   * @returns true if the toke can be parsed to a number
   */
  isNumber(token: TokenType): boolean {
    return !isNaN(Number(token));
  }

  /**
   * 
   * @param token
   * @returns true if the token is a cell reference
   * 
   */
  isCellReference(token: TokenType): boolean {

    return Cell.isValidCellLabel(token);
  }

  /**
   * 
   * @param token
   * @returns [value, ""] if the cell formula is not empty and has no error
   * @returns [0, error] if the cell has an error
   * @returns [0, ErrorMessages.invalidCell] if the cell formula is empty
   * 
   */
  getCellValue(token: TokenType): [number, string] {

    let cell = this._sheetMemory.getCellByLabel(token);
    let formula = cell.getFormula();
    let error = cell.getError();

    // if the cell has an error return 0
    if (error !== "" && error !== ErrorMessages.emptyFormula) {
      return [0, error];
    }

    // if the cell formula is empty return 0
    if (formula.length === 0) {
      return [0, ErrorMessages.invalidCell];
    }


    let value = cell.getValue();
    return [value, ""];

  }


}

export default FormulaEvaluator;