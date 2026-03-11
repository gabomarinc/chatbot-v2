import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Crear usuario admin
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'somos@konsul.digital' },
    update: {
      role: 'SUPER_ADMIN',
    },
    create: {
      email: 'somos@konsul.digital',
      name: 'Administrador',
      passwordHash: hashedPassword,
      image: null,
      role: 'SUPER_ADMIN',
    },
  });

  console.log('✅ Usuario creado:', user.email);

  // Crear planes de suscripción
  const planData = [
    {
      name: "Basic",
      type: "BASIC",
      monthlyPrice: 75,
      creditsPerMonth: 1200,
      maxAgents: 1,
      maxMembers: 2,
    },
    {
      name: "Starter",
      type: "STARTER",
      monthlyPrice: 135,
      creditsPerMonth: 2500,
      maxAgents: 3,
      maxMembers: 4,
    },
    {
      name: "Business",
      type: "BUSINESS",
      monthlyPrice: 245,
      creditsPerMonth: 7500,
      maxAgents: 6,
      maxMembers: 8,
    },
    {
      name: "Enterprise",
      type: "ENTERPRISE",
      monthlyPrice: 475,
      creditsPerMonth: 25000,
      maxAgents: 12,
      maxMembers: 20,
    },
  ];

  for (const plan of planData) {
    const existingPlan = await prisma.subscriptionPlan.findFirst({
      where: { type: plan.type as any }
    });

    if (existingPlan) {
      await prisma.subscriptionPlan.update({
        where: { id: existingPlan.id },
        data: {
          maxMembers: plan.maxMembers,
          monthlyPrice: plan.monthlyPrice,
          creditsPerMonth: plan.creditsPerMonth,
          maxAgents: plan.maxAgents,
          name: plan.name
        },
      });
    } else {
      await prisma.subscriptionPlan.create({
        data: {
          ...plan,
          type: plan.type as any
        },
      });
    }
  }

  console.log('✅ Planes de suscripción actualizados/creados');

  // Crear workspace
  let workspace = await prisma.workspace.findUnique({
    where: { id: 'workspace-1' },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        id: 'workspace-1',
        name: 'Mi Workspace',
        ownerId: user.id,
      },
    });
  }

  console.log('✅ Workspace creado:', workspace.name);

  // Crear membresía
  const existingMember = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: workspace.id,
      }
    },
  });

  if (!existingMember) {
    await prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: workspace.id,
        role: 'OWNER',
      },
    });
  }

  console.log('✅ Membresía creada');

  // Obtener el plan Freshie para asignar al workspace de prueba
  const freshiePlan = await prisma.subscriptionPlan.findFirst({
    where: { type: 'STARTER' }
  });

  if (freshiePlan) {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    await prisma.subscription.upsert({
      where: { workspaceId: workspace.id },
      update: {},
      create: {
        workspaceId: workspace.id,
        planId: freshiePlan.id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: nextMonth,
      },
    });

    console.log('✅ Suscripción creada');
  }

  // Crear balance de créditos
  await prisma.creditBalance.upsert({
    where: { workspaceId: workspace.id },
    update: {},
    create: {
      workspaceId: workspace.id,
      balance: 5000,
      totalUsed: 0,
      lastResetAt: new Date(),
    },
  });

  console.log('✅ Balance de créditos creado');

  // Crear agente de ejemplo
  const agent = await prisma.agent.create({
    data: {
      workspaceId: workspace.id,
      name: 'Paulina',
      avatarUrl: null,
      communicationStyle: 'NORMAL',
      personalityPrompt: 'Eres un asistente amigable y profesional especializado en ventas de bienes raíces. Tu objetivo es ayudar a los clientes a encontrar la propiedad perfecta, responder preguntas sobre proyectos inmobiliarios y agendar visitas.',
      jobType: 'SALES',
      jobCompany: 'Panamá Pacífico Partners',
      jobWebsiteUrl: 'https://ejemplo.com',
      jobDescription: 'Especialistas en venta de propiedades residenciales y comerciales en Panamá.',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      timezone: 'America/Panama',
      allowEmojis: false,
      signMessages: true,
      restrictTopics: false,
      splitLongMessages: true,
      smartRetrieval: true,
      transferToHuman: true,
    },
  });

  console.log('✅ Agente creado:', agent.name);

  // Crear canal de ejemplo (Webchat)
  await prisma.channel.create({
    data: {
      agentId: agent.id,
      type: 'WEBCHAT',
      displayName: 'Webchat',
      configJson: {},
      isActive: true,
    },
  });

  console.log('✅ Canal creado');

  // Crear intención de ejemplo
  await prisma.intent.create({
    data: {
      agentId: agent.id,
      name: 'Agendar visita',
      description: 'Cuando el usuario quiere agendar una visita a una propiedad',
      trigger: 'agendar visita|quiero ver|mostrarme|disponible para ver',
      actionUrl: null,
      payloadJson: {},
    },
  });

  console.log('✅ Intención creada');

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('\n📝 Credenciales de acceso:');
  console.log('   Email: somos@konsul.digital');
  console.log('   Password: admin123');
  console.log('\n⚠️  IMPORTANTE: Cambia la contraseña después del primer login!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

