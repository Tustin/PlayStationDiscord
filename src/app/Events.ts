import { EventEmitter } from 'events';

let appEvent;
export default appEvent || (appEvent = new EventEmitter());