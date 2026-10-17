import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { senha } = await request.json();

    if (senha === process.env.SENHA_MASTER) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, message: "Senha incorreta" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: "Erro no servidor" }, { status: 500 });
  }
}
