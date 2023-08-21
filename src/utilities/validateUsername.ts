import { doc, getDoc } from "firebase/firestore";
import { firestore } from "../firebase";

export async function validateUsername(username:string, sessionID:string){

    if(username.trim() === "")
        return false;

    const docRef = doc(firestore,'sessions',sessionID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        const usernames = data?.users;
        if(usernames){
            if(usernames.includes(username)){
                return false;
            }
      
        }
    }
    return true;
}