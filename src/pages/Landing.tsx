import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../firebase.ts';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import LandingBackground from '../assets/landing-background.jpeg';

export default function Landing() {
  return (
    <div className='background-image center-children' style={{ display: 'flex', flexDirection: 'column', backgroundImage: `url(${LandingBackground})` }}>
      {/* <h1 className='title'>
        FESTIVAL <br /> FRENZY
      </h1> */}
      <Input />
    </div>
  );
}

function Input() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  // async function handleSomething(code: string) {
  async function joinQuiz(code: string) {
    const sessionID = await validateCode(code);
    if (sessionID) {
      navigate(`/waiting-room/${sessionID}`);
    } else {
      console.log('error');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', rowGap: '18px' }}>
      <div id='input-container'>
        <h3>Enter your session code below:</h3>
        <input className='input-field' onChange={(e) => setCode(e.target.value)} type='number' placeholder='' style={{ letterSpacing: 3 }} />
      </div>

      <button id='start_button' type='button' onClick={() => joinQuiz(code)}>
        Join Session!
      </button>
    </div>
  );
}

async function validateCode(code: string): Promise<string | null> {
  try {
    const sessionsRef = collection(firestore, 'sessions');
    const q = query(sessionsRef, where('active', '==', true), where('code', '==', code));
    const querySnapshot = await getDocs(q);
    //Check if there is a session with the given code
    if (querySnapshot.empty) {
      return null;
    } else {
      return querySnapshot.docs[0].id;
    }
  } catch (error) {
    console.log(error);
    return null;
  }
}
