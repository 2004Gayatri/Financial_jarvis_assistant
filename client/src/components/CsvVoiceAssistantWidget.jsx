import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';

const CsvVoiceAssistantWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [manualQuery, setManualQuery] = useState('');
    const [responseTxt, setResponseTxt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(true);
    const [audioLevel, setAudioLevel] = useState(0);

    const recognitionRef = useRef(null);
    const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
    const streamRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);

    const responseLines = responseTxt
        ? responseTxt.split('\n').map(line => line.trim()).filter(Boolean)
        : [];

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setSpeechSupported(false);
            setResponseTxt('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
            return undefined;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-IN';
        recognition.maxAlternatives = 1;
        recognitionRef.current = recognition;

        recognition.onstart = () => {
            setIsListening(true);
            setResponseTxt('Listening...');
        };

        recognition.onresult = async (event) => {
            const spokenText = Array.from(event.results)
                .map(result => result[0]?.transcript || '')
                .join(' ')
                .trim();

            setTranscript(spokenText);

            const lastResult = event.results[event.results.length - 1];
            if (!lastResult?.isFinal) {
                return;
            }

            const finalTranscript = spokenText;
            setIsListening(false);

            if (finalTranscript.length < 2) {
                setResponseTxt('I could not understand that. Please try again.');
                return;
            }

            await handleQuerySubmit(finalTranscript);
        };

        recognition.onerror = (event) => {
            console.warn('Recognition error:', event.error);
            setIsListening(false);
            stopAudioMonitoring();

            const errors = {
                'audio-capture': 'No microphone was detected. Please check your microphone connection.',
                'network': 'Speech recognition hit a network issue. Please try again.',
                'not-allowed': 'Microphone permission is blocked. Please allow microphone access in your browser settings.',
                'service-not-allowed': 'This browser blocked speech recognition service access.',
                'no-speech': 'Your microphone is open, but no speech was recognized. Check the live mic bar below. If it moves, try the text box or switch Chrome speech language.',
                'aborted': 'Listening was stopped before any speech was captured.'
            };

            setResponseTxt(errors[event.error] || 'I could not capture your audio. Please try again.');
        };

        recognition.onend = () => {
            setIsListening(false);
            stopAudioMonitoring();
        };

        return () => {
            stopAudioMonitoring();
            recognition.stop();
        };
    }, []);

    const stopAudioMonitoring = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        analyserRef.current = null;
        setAudioLevel(0);
    };

    const startAudioMonitoring = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            return true;
        }

        stopAudioMonitoring();

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            streamRef.current = stream;
            return true;
        }

        const audioContext = new AudioContextClass();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        const dataArray = new Uint8Array(analyser.fftSize);

        analyser.fftSize = 256;
        source.connect(analyser);

        streamRef.current = stream;
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const updateLevel = () => {
            if (!analyserRef.current) {
                return;
            }

            analyserRef.current.getByteTimeDomainData(dataArray);
            let sum = 0;

            for (let i = 0; i < dataArray.length; i += 1) {
                const normalized = (dataArray[i] - 128) / 128;
                sum += normalized * normalized;
            }

            const rms = Math.sqrt(sum / dataArray.length);
            setAudioLevel(Math.min(1, rms * 6));
            animationFrameRef.current = requestAnimationFrame(updateLevel);
        };

        updateLevel();
        return true;
    };

    const speak = (text) => {
        const synth = synthRef.current;
        if (!synth || !text) {
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        synth.cancel();
        synth.speak(utterance);
    };

    const handleQuerySubmit = async (query) => {
        setIsLoading(true);
        setResponseTxt('Checking your CSV data...');

        try {
            const res = await axios.post('https://financial-jarvis-assistant.onrender.com/api/ask', { query });
            const answer = res.data?.answer || 'I could not find an answer in the uploaded CSV data.';
            setResponseTxt(answer);
            speak(answer.split('\n').map(line => line.replace(/^-\s*/, '').trim()).filter(Boolean).join('. '));
        } catch (err) {
            console.error('Error answering from CSV data:', err);
            const errorMessage = 'I could not read the stored CSV data right now. Please make sure the server is running and try again.';
            setResponseTxt(errorMessage);
            speak(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleManualSubmit = async () => {
        const trimmedQuery = manualQuery.trim();
        if (!trimmedQuery) {
            return;
        }

        setTranscript(trimmedQuery);
        setManualQuery('');
        await handleQuerySubmit(trimmedQuery);
    };

    const toggleListen = async () => {
        if (!speechSupported || !recognitionRef.current) {
            setResponseTxt('Speech recognition is not available in this browser.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
            stopAudioMonitoring();
            return;
        }

        try {
            synthRef.current?.cancel();
            await startAudioMonitoring();
            setTranscript('');
            setResponseTxt('');
            recognitionRef.current.start();
        } catch (err) {
            console.error('Microphone start failed:', err);
            setIsListening(false);
            stopAudioMonitoring();
            setResponseTxt('Microphone access was denied or unavailable. Please allow microphone permission and try again.');
        }
    };

    return (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="glass-panel"
                        style={{
                            width: '340px',
                            maxWidth: 'calc(100vw - 32px)',
                            padding: '24px',
                            marginBottom: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            background: 'rgba(30,30,40,0.95)',
                            height: 'min(560px, calc(100vh - 100px))'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Jarvis Voice Assistant</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}
                            >
                                x
                            </button>
                        </div>

                        <div
                            style={{
                                background: 'rgba(0,0,0,0.3)',
                                padding: '16px',
                                borderRadius: '8px',
                                minHeight: '120px',
                                flex: 1,
                                overflowY: 'auto',
                                fontSize: '14px',
                                lineHeight: '1.5',
                                wordBreak: 'break-word',
                                textAlign: 'left'
                            }}
                        >
                            {isLoading ? (
                                <span style={{ color: 'var(--text-muted)' }}>Checking your CSV data...</span>
                            ) : responseTxt ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {responseLines.map((line, index) => {
                                        const isBullet = line.startsWith('- ');
                                        return (
                                            <div
                                                key={`${line}-${index}`}
                                                style={{
                                                    display: 'flex',
                                                    gap: '10px',
                                                    alignItems: 'flex-start',
                                                    padding: '8px 10px',
                                                    borderRadius: '10px',
                                                    background: isBullet ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.05)',
                                                    border: '1px solid rgba(255,255,255,0.08)'
                                                }}
                                            >
                                                <span style={{ color: isBullet ? 'var(--primary)' : '#f8fafc', fontWeight: 600, minWidth: '18px' }}>
                                                    {isBullet ? `${index}.` : '>'}
                                                </span>
                                                <span>{line.replace(/^- /, '')}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : transcript ? (
                                <span style={{ color: 'var(--primary)', fontStyle: 'italic' }}>"{transcript}"</span>
                            ) : (
                                <span style={{ color: 'var(--text-muted)' }}>
                                    Tap the mic and ask about your uploaded data, like "What is my total expense in March?" or "Show expense by category."
                                </span>
                            )}
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                <span>Mic input</span>
                                <span>{Math.round(audioLevel * 100)}%</span>
                            </div>
                            <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                                <div
                                    style={{
                                        width: `${Math.max(6, audioLevel * 100)}%`,
                                        height: '100%',
                                        borderRadius: '999px',
                                        transition: 'width 80ms linear',
                                        background: audioLevel > 0.08
                                            ? 'linear-gradient(90deg, #22c55e, #eab308)'
                                            : 'linear-gradient(90deg, #64748b, #94a3b8)'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                            <input
                                value={manualQuery}
                                onChange={(event) => setManualQuery(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        handleManualSubmit();
                                    }
                                }}
                                placeholder='Type your question here'
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    background: 'rgba(255,255,255,0.06)',
                                    color: 'white',
                                    outline: 'none'
                                }}
                            />
                            <button
                                onClick={handleManualSubmit}
                                className="btn-primary"
                                style={{ minWidth: '76px', justifyContent: 'center' }}
                            >
                                Ask
                            </button>
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
                    <i className='bx bx-brain' />
                </motion.button>
            )}
        </div>
    );
};

export default CsvVoiceAssistantWidget;
