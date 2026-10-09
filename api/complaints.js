// Bare `/api/complaints` endpoint, delegated to the shared complaints handler.
import handler from './complaints/[[...path]].js';

export default function complaints(req, res) {
  return handler(req, res);
}
