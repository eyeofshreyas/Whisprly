export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

// Local listeners registry for mocking auth state without Firebase
const listeners = new Set<(user: User | null) => void>();
let currentUser: User | null = {
  uid: "local-user-id",
  displayName: "Shreyas",
  email: "shreyas@local",
  photoURL: null
};

function notifyListeners() {
  for (const listener of listeners) {
    listener(currentUser);
  }
}

export async function signInWithGoogle(): Promise<void> {
  currentUser = {
    uid: "local-user-id",
    displayName: "Shreyas",
    email: "shreyas@local",
    photoURL: null
  };
  notifyListeners();
  return Promise.resolve();
}

export async function signOutUser(): Promise<void> {
  currentUser = null;
  notifyListeners();
  return Promise.resolve();
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  listeners.add(callback);
  // Send current state immediately in a microtask
  Promise.resolve().then(() => callback(currentUser));
  return () => {
    listeners.delete(callback);
  };
}
