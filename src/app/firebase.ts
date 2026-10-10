import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { environment } from '../environments/environment';

const firebaseApp = initializeApp(environment.firebase);

export const database = getDatabase(firebaseApp);
export const auth = getAuth(firebaseApp);
