import React, { useEffect, useState } from 'react';
import { Download, Share2 } from 'lucide-react';

const isStandalone = () =>
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    window.navigator.standalone === true;

// iOS/iPadOS не умеет beforeinstallprompt — там можно только показать инструкцию
const isIosSafari = () => {
    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) ||
        (ua.includes('Macintosh') && window.navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|YaBrowser/.test(ua);
    return isIos && isSafari;
};

const InstallButton = () => {
    const [promptEvent, setPromptEvent] = useState(null);
    const [iosAvailable, setIosAvailable] = useState(false);
    const [iosHint, setIosHint] = useState(false);

    useEffect(() => {
        if (isStandalone()) return;

        const onBeforeInstall = e => {
            e.preventDefault();
            setPromptEvent(e);
        };
        const onInstalled = () => {
            setPromptEvent(null);
            setIosAvailable(false);
        };

        window.addEventListener('beforeinstallprompt', onBeforeInstall);
        window.addEventListener('appinstalled', onInstalled);
        if (isIosSafari()) setIosAvailable(true);

        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstall);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    if (!promptEvent && !iosAvailable) return null;

    const handleClick = async () => {
        if (!promptEvent) {
            setIosHint(v => !v);
            return;
        }
        promptEvent.prompt();
        await promptEvent.userChoice;
        // Chrome разрешает вызвать prompt() один раз — прячем кнопку в любом случае
        setPromptEvent(null);
    };

    return (
        <div className="relative flex items-center">
            <button
                type="button"
                onClick={handleClick}
                className="pill !py-1 !px-3 !text-[11.5px]"
                title="Установить как приложение"
                aria-label="Установить как приложение"
            >
                <Download size={13} />
                Установить
            </button>

            {iosHint && (
                <div className="absolute bottom-full right-0 mb-2 z-40 w-[212px] rounded-[10px] border border-hairline bg-panel px-3 py-2 text-[11px] leading-snug text-cream-muted shadow-lg">
                    Нажмите <Share2 size={12} className="inline -mt-0.5 text-cream" /> «Поделиться»
                    и выберите «На экран „Домой“».
                </div>
            )}
        </div>
    );
};

export default InstallButton;
