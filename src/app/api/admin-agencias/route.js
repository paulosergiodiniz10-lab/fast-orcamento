import { NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function autenticacaoValida(req) {
  const authHeader = req.headers.get("x-admin-master-key");
  const masterKey = process.env.SENHA_MASTER;
  return Boolean(authHeader && masterKey && authHeader === masterKey);
}

// 1. LISTAR TODAS AS AGÊNCIAS
export async function GET(req) {
  if (!autenticacaoValida(req)) {
    return NextResponse.json({ ok: false, message: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb.collection("agencias").get();
    const agencias = [];
    snapshot.forEach((doc) => {
      agencias.push({ id: doc.id, ...doc.data() });
    });

    return NextResponse.json({ ok: true, agencias });
  } catch (err) {
    console.error("Erro ao listar agências:", err);
    return NextResponse.json({ ok: false, message: "Erro ao buscar agências." }, { status: 500 });
  }
}

// 2. CRIAR NOVA AGÊNCIA
export async function POST(req) {
  if (!autenticacaoValida(req)) {
    return NextResponse.json({ ok: false, message: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const adminDb = getAdminDb();
    const body = await req.json();
    const docRef = await adminDb.collection("agencias").add({
      nome: body.nome || "",
      usuario: body.usuario || "",
      senha: body.senha || "",
      whatsapp: body.whatsapp || "",
      cadastur: body.cadastur || "Regular / Ativo",
      permiteTarifario: Boolean(body.permiteTarifario),
      status: "ativo",
      criadoEm: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, id: docRef.id });
  } catch (err) {
    console.error("Erro ao criar agência:", err);
    return NextResponse.json({ ok: false, message: "Erro ao cadastrar agência." }, { status: 500 });
  }
}

// 3. EDITAR AGÊNCIA OU MUDAR STATUS
export async function PUT(req) {
  if (!autenticacaoValida(req)) {
    return NextResponse.json({ ok: false, message: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const adminDb = getAdminDb();
    const { id, dados } = await req.json();
    if (!id || !dados) {
      return NextResponse.json({ ok: false, message: "Dados insuficientes." }, { status: 400 });
    }

    await adminDb.collection("agencias").doc(id).update({
      ...dados,
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro ao atualizar agência:", err);
    return NextResponse.json({ ok: false, message: "Erro ao atualizar agência." }, { status: 500 });
  }
}

// 4. EXCLUIR AGÊNCIA
export async function DELETE(req) {
  if (!autenticacaoValida(req)) {
    return NextResponse.json({ ok: false, message: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const adminDb = getAdminDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ ok: false, message: "ID não fornecido." }, { status: 400 });
    }

    await adminDb.collection("agencias").doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro ao excluir agência:", err);
    return NextResponse.json({ ok: false, message: "Erro ao excluir agência." }, { status: 500 });
  }
}
