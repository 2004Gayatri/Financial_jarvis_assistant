import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const VoiceAssistantWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [responseTxt, setResponseTxt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(true);

    const recognitionRef = useRef(null);
    const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setSpeechSupported(false);
            setResponseTxt('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
            return undefined;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;
        recognitionRef.current = recognition;

        recognition.onstart = () => {
            setIsListening(true);
            setResponseTxt('Listening...');
        };

        recognition.onresult = async (event) => {
            const finalTranscript = Array.from(event.results)
                .map(result => result[0]?.transcript || '')
                .join(' ')
                .trim();

            setTranscript(finalTranscript);
            setIsListening(false);

            if (finalTranscript.length < 2) {
                setResponseTxt('I could not understand that. Please try again.');
                return;
            }

            await handleQuerySubmit(finalTranscript);
        };

       recognition.onerror = (event) => {
    console.warn("Recognition error:", event.error);

    setIsListening(false);

    if (event.error === "no-speech") {
        setResponseTxt("I didn’t hear anything. Please try again 🎤");

        // 🔁 restart after delay (better UX)
        setTimeout(() => {
            try {
                recognition.start();
            } catch (e) {
                console.warn("Restart failed:", e);
            }
        }, 2000);
    }
};

        recognition.onerror = (event) => {
            console.warn('Recognition error:', event.error);
            setIsListening(false);

            const errors = {
                'audio-capture': 'No microphone was detected. Please check your microphone connection.',
                'network': 'Speech recognition hit a network issue. Please try again.',
                'not-allowed': 'Microphone permission is blocked. Please allow microphone access in your browser settings.',
                'service-not-allowed': 'This browser blocked speech recognition service access.',
                'no-speech': 'I did not hear anything. Please speak closer to the microphone and try again.',
                'aborted': 'Listening was stopped before any speech was captured.'
            };

            setResponseTxt(errors[event.error] || 'I could not capture your audio. Please try again.');
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        return () => {
            recognition.stop();
        };
    }, []);

    const ensureMicrophonePermission = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            return true;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
    };

    const toggleListen = async () => {
        if (!speechSupported || !recognitionRef.current) {
            setResponseTxt('Speech recognition is not available in this browser.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
            return;
        }

        try {
            synthRef.current?.cancel();
            await ensureMicrophonePermission();
            setTranscript('');
            setResponseTxt('');
            recognitionRef.current.start();
        } catch (err) {
            console.error('Microphone start failed:', err);
            setIsListening(false);
            setResponseTxt('Microphone access was denied or unavailable. Please allow microphone permission and try again.');
        }
    };

    const handleQuerySubmit = async (query) => {
        setIsLoading(true);
        setResponseTxt('Checking your uploaded data...');
        try {
            const res = await axios.post('https://financial-jarvis-assistant.onrender.com/api/ask', { query });
            const answer = res.data?.answer || 'I could not find an answer in the uploaded CSV data.';
            setResponseTxt(answer);
            speak(answer);
        } catch (err) {
            console.error('Error answering from CSV data:', err);
            const errorMessage = 'I could not read the stored CSV data right now. Please make sure the server is running and try again.';
            setResponseTxt(errorMessage);
            speak(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const speak = (text) => {
        const synth = synthRef.current;
        if (!synth || !text) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;

        synth.cancel();
        synth.speak(utterance);
    };

    return (
        <div style={{ position: 'fixed', bottom: '40px', right: '40px', zIndex: 9999 }}>
            
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="glass-panel"
                        style={{
                            width: '320px',
                            padding: '24px',
                            marginBottom: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            background: 'rgba(30,30,40,0.95)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Jarvis Voice Assistant</h3>
                            <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}>
                                ✕
                            </button>
                        </div>
                        
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', minHeight: '96px', fontSize: '14px', lineHeight: '1.5' }}>
                            {isLoading ? (
                                <span style={{ color: 'var(--text-muted)' }}>Analyzing Data... 🤔</span>
                            ) : responseTxt ? (
                                <span>{responseTxt}</span>
                            ) : transcript ? (
                                <span style={{ color: 'var(--primary)', fontStyle: 'italic' }}>"{transcript}"</span>
                            ) : (
                                <span style={{ color: 'var(--text-muted)' }}>Tap the mic and ask about your uploaded data, like "What is my total expense in March?" or "Show expense by category."</span>
                            )}
                        </div>

                        <button 
                            onClick={toggleListen}
                            className="btn-primary"
                            disabled={!speechSupported}
                            style={{ 
                                alignSelf: 'center', 
                                width: '60px', 
                                height: '60px', 
                                borderRadius: '50%', 
                                justifyContent: 'center',
                                opacity: speechSupported ? 1 : 0.6,
                                background: isListening ? 'var(--danger)' : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                boxShadow: isListening ? '0 0 20px rgba(239, 68, 68, 0.5)' : '0 4px 14px rgba(99, 102, 241, 0.4)'
                            }}
                        >
                            <i className={isListening ? 'bx bx-stop' : 'bx bx-microphone'} style={{ fontSize: '28px' }} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {!isOpen && (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(true)}
                    style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        border: 'none',
                        color: 'white',
                        boxShadow: '0 10px 25px rgba(99, 102, 241, 0.5)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px'
                    }}
                >
                    <i className='bx bx-brain'></i>
                </motion.button>
            )}

        </div>
    );
};

export default VoiceAssistantWidget;
