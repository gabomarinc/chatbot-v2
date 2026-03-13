'use client'

import React from 'react';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [platformIndex, setPlatformIndex] = React.useState(0);
    const platforms = ["WhatsApp Business", "Instagram", "Tu Sitio Web", "y mucho más"];

    React.useEffect(() => {
        const interval = setInterval(() => {
            setPlatformIndex((prev) => (prev + 1) % platforms.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen flex bg-white font-sans selection:bg-[#21AC96]/10 selection:text-[#21AC96]">
            {/* Left Side: Marketing/Emotional (Visible only on lg) */}
            <div className="hidden lg:flex lg:w-[32%] relative overflow-hidden bg-[#21AC96] shrink-0">
                <img 
                    src="/auth-bg.png" 
                    alt="Kônsul AI Platform" 
                    className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-80"
                />
                
                {/* Gradient Overlay for legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#21AC96] via-[#21AC96]/40 to-transparent"></div>
                
                <div className="relative z-10 w-full h-full flex flex-col justify-end p-10 text-white">
                    <div className="mb-12 animate-in fade-in slide-in-from-left-8 duration-700 delay-100">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 mb-6 group hover:bg-white/20 transition-all cursor-default">
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Kônsul AI</span>
                        </div>
                        
                        <h2 className="text-3xl font-black tracking-tighter leading-tight mb-6 min-h-[4em]">
                            Un Hub con chatbots, donde optimizas tus <br/>
                            <span className="italic underline underline-offset-8 decoration-white/30">Leads</span> de <br/>
                            <span className="text-white inline-flex flex-col h-[1.2em] overflow-hidden whitespace-nowrap">
                                <span 
                                    className="transition-transform duration-500 ease-in-out"
                                    style={{ transform: `translateY(-${platformIndex * 100}%)` }}
                                >
                                    {platforms.map((p, i) => (
                                        <span key={i} className="block h-[1.2em] leading-tight">{p}</span>
                                    ))}
                                </span>
                            </span>
                        </h2>
                        
                        <p className="text-sm font-medium text-white/80 max-w-xs leading-relaxed">
                            Centraliza tus leads de WhatsApp e Instagram. <br/><br/>
                            <span className="text-white font-bold">Automatiza tus ventas</span> con Agentes IA que prospectan y convierten.
                        </p>
                    </div>
                    
                    {/* Stats Section */}
                    <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all">
                            <p className="text-2xl font-black mb-1">78%</p>
                            <p className="text-[10px] leading-tight font-medium text-white/80">de los leads compran al primero que contesta.</p>
                        </div>
                        
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all">
                            <p className="text-2xl font-black mb-1">89%</p>
                            <p className="text-[10px] leading-tight font-medium text-white/80">De aumento en retención y conversión de clientes.</p>
                        </div>
                        
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all">
                            <p className="text-2xl font-black mb-1">4X</p>
                            <p className="text-[10px] leading-tight font-medium text-white/80">En aumento de la capacidad de cada vendedor.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Form Content */}
            <div className="w-full lg:w-[70%] flex flex-col min-h-screen relative bg-gray-50/50">
                {/* Mobile Header (Hidden on lg) */}
                <div className="lg:hidden p-8 flex flex-col items-center">
                    <img
                        src="/icono-konsul.png"
                        alt="Kônsul"
                        className="w-12 h-12 rounded-xl shadow-xl shadow-[#21AC96]/10 mb-4"
                    />
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">Kônsul</h1>
                </div>

                <div className="flex-1 flex items-center justify-center p-6 md:p-12">
                    <div className="w-full animate-in fade-in zoom-in-95 duration-500">
                        {/* Internal Branding for large screens */}
                        <div className="hidden lg:block mb-8 px-4">
                            <img
                                src="/icono-konsul.png"
                                alt="Kônsul"
                                className="w-10 h-10 rounded-xl shadow-xl shadow-[#21AC96]/10 mb-2 hover:scale-110 transition-transform cursor-pointer"
                                onClick={() => window.location.href = '/'}
                            />
                        </div>
                        
                        <div className="bg-white lg:bg-transparent rounded-[3rem] lg:rounded-none shadow-2xl shadow-gray-200/50 lg:shadow-none p-4 md:p-10 lg:p-0">
                            {children}
                        </div>
                    </div>
                </div>

                {/* Footer Copyright */}
                <div className="p-8 text-center lg:text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    © 2026 Kônsul — La nueva era de la prospección y atención al cliente.
                </div>
            </div>
        </div>
    );
}
