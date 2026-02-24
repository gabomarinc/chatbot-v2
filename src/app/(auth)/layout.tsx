import React from 'react';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFB] relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gradient-to-br from-[#21AC96]/10 to-transparent rounded-full blur-3xl opacity-50"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gradient-to-tl from-[#21AC96]/10 to-transparent rounded-full blur-3xl opacity-50"></div>
            </div>

            <div className="w-full max-w-md p-6 relative z-10 animate-fade-in">
                <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white/50 p-10 backdrop-blur-sm">
                    {/* Logo/Brand */}
                    <div className="flex flex-col items-center mb-10">
                        <img
                            src="/icono-konsul.png"
                            alt="Kônsul"
                            className="w-16 h-16 rounded-2xl object-cover mb-4 shadow-lg shadow-[#21AC96]/20 hover:scale-105 transition-transform cursor-pointer"
                        />
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Kônsul</h1>
                        <p className="text-gray-500 text-sm mt-1">Plataforma de Agentes IA</p>
                    </div>

                    {children}
                </div>
            </div>
        </div>
    );
}
