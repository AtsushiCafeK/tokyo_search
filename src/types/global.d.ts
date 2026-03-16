// src/types/global.d.ts

interface Window {
    __gcse?: {
        parsetags?: string;
        initializationCallback?: () => void;
    };
    google?: {
        search: {
            cse: {
                element: {
                    render: (options: { div: string; tag: string; attributes?: any }) => void;
                    getElement: (id: string) => any;
                };
            };
        };
        setOnLoadCallback: (callback: () => void, async?: boolean) => void;
    };
}
