import { Session } from "../modules/sessions/session.model";

export async function createSession(
  userId: string,
  userAgent: string,
  role: string
) {
  const session = await Session.create({ user: userId, userAgent, role });

  return session.toJSON();
}
