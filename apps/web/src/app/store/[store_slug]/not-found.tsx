import React from "react";
import Link from "next/link";

export default function NotFoundStore() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-stone-200 p-10 max-w-md w-full text-center shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          ⚠️
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2">Comercio no encontrado</h2>
        <p className="text-sm text-stone-600 mb-8">
          La tienda a la que intentas acceder no existe o el enlace es incorrecto.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center w-full px-5 py-3 rounded-2xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
        >
          Volver al directorio de tiendas
        </Link>
      </div>
    </div>
  );
}
