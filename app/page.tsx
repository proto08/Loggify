"use client";

import { motion } from "framer-motion";
import { Logs, ShieldCheck, UserCheck } from 'lucide-react';


const features = [
  {
      icon: <Logs className="h-6 w-6" />,
      title: "Advanced Logging",
      description: "Track verified users with comprehensive logging including account details, GPS and IP location data, and browser fingerprinting",
  },
  {
      icon: <UserCheck className="h-6 w-6" />,
      title: "Advanced Backup",
      description: "Comprehensive backup solutions for both server data and member information, ensuring complete protection of your community assets",
  },
  {
      icon: <ShieldCheck className="h-6 w-6" />,
      title: "Security",
      description: "Enhanced security with anti-bot protection through captcha and code obfuscation. Includes capabilities to block VPNs, proxies, and detect alternate accounts",
  },
];

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white">
      <section className="container mx-auto px-4 pt-[350px] pb-16 text-center relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent"></div>      
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="text-6xl md:text-7xl font-bold mb-8 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-300 to-white">
              Build your own Logger
            </h1>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <p className="text-xl md:text-2xl text-gray-400 mb-12 tracking-wide max-w-2xl mx-auto leading-relaxed">
              Loggify is a Advanced Discord Logger for Server Admins.
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="flex gap-6 justify-center"
          >
            <button className="group relative px-8 py-4 overflow-hidden rounded-lg bg-white text-black transition-all duration-300">
              <span className="relative z-10 font-medium">Get Started</span>
            </button>
            <button className="group relative px-8 py-4 overflow-hidden rounded-lg border border-white/20 hover:border-white/40 transition-all duration-300">
              <span className="relative z-10 text-white font-medium">Documentation</span>
            </button>
          </motion.div>
      </section>
      <section className="container mx-auto px-4 py-16 text-center relative">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.2 }}
            className="group p-9 rounded-3xl border border-white/[0.08] bg-white/[0.02]  hover:border-white/[0.12] transition-colors duration-300 "
          >
            <div className="w-12 h-12 rounded-full bg-gray-500/10 flex items-center justify-center mb-4 text-gray-400">
                {feature.icon}
            </div>
            <h3 className="text-xl font-semibold text-white text-left mb-2">
                {feature.title}
            </h3>
            <p className="text-gray-400 text-left">{feature.description}</p>
          </motion.div>
        ))}
                </div>
      </section>
      <section className="">
        <div className="container mx-auto px-4 py-16 text-center relative">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-300 to-white">
            Advanced Features
          </h2>
          <p className="text-xl md:text-2xl text-gray-400 mb-12 tracking-wide max-w-2xl mx-auto leading-relaxed">
            Loggify is a Advanced Discord Logger for Server Admins.
          </p>
        </div>
      </section>
    </main>
  );
}



