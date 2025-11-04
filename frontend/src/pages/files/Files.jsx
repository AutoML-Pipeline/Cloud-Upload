import React from 'react';
// import UploadedFilesTable from "../components/UploadedFilesTable"; // Removed UploadedFilesTable import

export default function FilesPage() {
  return (
    <div className="page-fullscreen min-h-screen bg-black">
      <div className="relative w-full min-h-[calc(100vh-60px)] flex items-center justify-center p-6">
        <div className="w-[min(1200px,92vw)] bg-slate-900/90 border border-slate-700 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-6">
          <h2 className="text-slate-200 mb-4 font-extrabold tracking-[0.02em]">Uploaded Files</h2>
          {/* <UploadedFilesTable /> */}
          <p className="text-slate-300 text-center mt-5">This page is no longer in use.</p>
        </div>
      </div>
    </div>
  );
}


