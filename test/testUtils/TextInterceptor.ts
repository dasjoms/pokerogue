/**
 * Class will intercept any text or dialogue message calls and log them for test purposes
 */
export default class TextInterceptor {
  private scene;
  public logs: string[] = [];
  constructor(scene) {
    this.scene = scene;
    scene.messageWrapper = this;
  }

  showText(
    text: string,
    _delay?: number,
    _callback?: Function,
    _callbackDelay?: number,
    _prompt?: boolean,
    _promptDelay?: number,
  ): void {
    // Suppress console output during headless execution
    this.logs.push(text);
    if (_callback) {
      _callback();
    }
  }

  showDialogue(
    text: string,
    name: string,
    _delay?: number,
    _callback?: Function,
    _callbackDelay?: number,
    _promptDelay?: number,
  ): void {
    // Suppress console output during headless execution
    this.logs.push(name, text);
    if (_callback) {
      _callback();
    }
  }

  getLatestMessage(): string {
    return this.logs.pop() ?? "";
  }
}
