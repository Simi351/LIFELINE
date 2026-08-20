// FIREBASE KONFIGURATION
// Ersetze die Platzhalter durch die Daten aus:
// Firebase Console > Project settings > Your apps > Web app > SDK setup and configuration

export const firebaseConfig = {
  apiKey: "AIzaSyAmVGjH6VstNu9iP2c0W27rTEKkIEegMfg",
  authDomain: "lifeline-25064.firebaseapp.com",
  databaseURL: "https://lifeline-25064-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "lifeline-25064",
  storageBucket: "lifeline-25064.firebasestorage.app",
  messagingSenderId: "40793878622",
  appId: "1:40793878622:web:5e2843b491a829be18c4cf",
  measurementId: "G-74F959206S"
};

// Muss exakt der E-Mail entsprechen, die du in Firebase Authentication
// als Game-Master-Benutzer anlegst.
export const gameMasterEmail = "gamemaster@example.com";
