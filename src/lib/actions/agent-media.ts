'use server'

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { uploadFileToR2 } from '@/lib/r2';

/**
 * Obtiene todas las imágenes de un agente
 */
export async function getAgentMedia(agentId: string) {
    const session = await auth();
    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    // Verificar que el usuario tiene acceso al workspace del agente
    const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: {
            workspace: {
                include: {
                    members: {
                        where: {
                            userId: session.user.id
                        }
                    }
                }
            }
        }
    });

    if (!agent) {
        throw new Error('Agent not found');
    }

    // Verificar permisos
    const isOwner = agent.workspace.ownerId === session.user.id;
    const isMember = agent.workspace.members.length > 0;

    if (!isOwner && !isMember) {
        throw new Error('Unauthorized');
    }

    const media = await prisma.agentMedia.findMany({
        where: { agentId },
        orderBy: { createdAt: 'desc' }
    });

    return media;
}

/**
 * Sube una imagen para un agente
 */
export async function uploadAgentMedia(
    agentId: string,
    file: File,
    description?: string,
    tags?: string[],
    altText?: string,
    prompt?: string
) {
    const session = await auth();
    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    // Verificar que el usuario tiene acceso al workspace del agente
    const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: {
            workspace: {
                include: {
                    members: {
                        where: {
                            userId: session.user.id
                        }
                    }
                }
            }
        }
    });

    if (!agent) {
        throw new Error('Agent not found');
    }

    // Verificar permisos
    const isOwner = agent.workspace.ownerId === session.user.id;
    const isMember = agent.workspace.members.length > 0;

    if (!isOwner && !isMember) {
        throw new Error('Unauthorized');
    }

    // Validar que es una imagen
    if (!file.type.startsWith('image/')) {
        throw new Error('El archivo debe ser una imagen');
    }

    // Validar tamaño (max 10MB)
    if (file.size > 5 * 1024 * 1024) {
        throw new Error('El archivo debe ser menor a 5MB');
    }

    // Subir a R2
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;

    const url = await uploadFileToR2(buffer, fileName, file.type);

    // Guardar en base de datos
    const media = await prisma.agentMedia.create({
        data: {
            agentId,
            url,
            fileName: file.name,
            description: description || null,
            tags: tags || [],
            altText: altText || null,
            prompt: prompt || null
        }
    });

    return media;
}

/**
 * Elimina una imagen de un agente
 */
export async function deleteAgentMedia(mediaId: string) {
    const session = await auth();
    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    // Verificar que el usuario tiene acceso al workspace del agente
    const media = await prisma.agentMedia.findUnique({
        where: { id: mediaId },
        include: {
            agent: {
                include: {
                    workspace: {
                        include: {
                            members: {
                                where: {
                                    userId: session.user.id
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!media) {
        throw new Error('Media not found');
    }

    // Verificar permisos
    const isOwner = media.agent.workspace.ownerId === session.user.id;
    const isMember = media.agent.workspace.members.length > 0;

    if (!isOwner && !isMember) {
        throw new Error('Unauthorized');
    }

    await prisma.agentMedia.delete({
        where: { id: mediaId }
    });

    return { success: true };
}

/**
 * Busca imágenes de un agente por tags o descripción
 */
export async function searchAgentMedia(agentId: string, query: string) {
    const session = await auth();
    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    // Verificar que el usuario tiene acceso al workspace del agente
    const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: {
            workspace: {
                include: {
                    members: {
                        where: {
                            userId: session.user.id
                        }
                    }
                }
            }
        }
    });

    if (!agent) {
        throw new Error('Agent not found');
    }

    // Verificar permisos
    const isOwner = agent.workspace.ownerId === session.user.id;
    const isMember = agent.workspace.members.length > 0;

    if (!isOwner && !isMember) {
        throw new Error('Unauthorized');
    }

    // Buscar por tags o descripción
    const media = await prisma.agentMedia.findMany({
        where: {
            agentId,
            OR: [
                {
                    tags: {
                        hasSome: [query.toLowerCase()]
                    }
                },
                {
                    description: {
                        contains: query,
                        mode: 'insensitive'
                    }
                },
                {
                    fileName: {
                        contains: query,
                        mode: 'insensitive'
                    }
                }
            ]
        },
        orderBy: { createdAt: 'desc' }
    });

    return media;
}

