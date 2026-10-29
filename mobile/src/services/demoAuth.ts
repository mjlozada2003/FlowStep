export type DemoUser = {
  name: string;
  email: string;
  password: string;
};

const DEMO_USER: DemoUser = {
  name: 'Usuario Demo',
  email: 'demo@flowstep.app',
  password: 'FlowStep123!',
};

let registeredUser: DemoUser | null = null;

export function registerDemoUser(
  user: DemoUser,
): 'created' | 'exists' {
  const email = user.email.trim().toLowerCase();

  if (
    email === DEMO_USER.email ||
    email === registeredUser?.email.trim().toLowerCase()
  ) {
    return 'exists';
  }

  registeredUser = {
    ...user,
    email,
  };

  return 'created';
}

export function validateDemoCredentials(
  email: string,
  password: string,
): boolean {
  const normalizedEmail = email.trim().toLowerCase();

  const matchesDemoUser =
    normalizedEmail === DEMO_USER.email &&
    password === DEMO_USER.password;

  const matchesRegisteredUser =
    registeredUser !== null &&
    normalizedEmail === registeredUser.email.trim().toLowerCase() &&
    password === registeredUser.password;

  return matchesDemoUser || matchesRegisteredUser;
}