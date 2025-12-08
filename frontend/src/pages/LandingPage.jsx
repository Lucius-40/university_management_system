import React from "react";

const LandingPage = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
            <div className="bg-white bg-opacity-80 rounded-3xl shadow-2xl p-12 flex flex-col items-center">
                <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 mb-6 animate-bounce">
                    bonjour !!!
                </h1>
                <p className="text-lg text-gray-700 font-medium">
                    Welcome to your university management system.
                </p>
            </div>
        </div>
    );
};

export default LandingPage;