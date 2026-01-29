'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface FilterCondition {
    field: string; // "monthly_salary" or "city"
    operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'isSet' | 'isNotSet';
    value?: any;
}

export interface GetContactsOptions {
    workspaceId: string;
    filters?: FilterCondition[];
    page?: number;
    pageSize?: number;
}

export async function getContacts({ workspaceId, filters = [], page = 1, pageSize = 20 }: GetContactsOptions) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {
            workspaceId,
        };

        if (filters.length > 0) {
            // Build JSONB filter query
            const jsonFilters = filters.map(filter => {
                const { field, operator, value } = filter;
                const lowerField = field.toLowerCase();
                const isStandardField = ['name', 'email', 'phone'].includes(lowerField);
                const isAgentField = lowerField === 'agentid';

                // Initialize operation object
                let op: any = {};

                if (isAgentField) {
                    // Agent Filter: Find contacts with conversations with this agent
                    // Logic: contacts where conversations some agentId = value
                    // We return a top-level where clause for this.
                    return {
                        conversations: {
                            some: {
                                agentId: value
                            }
                        }
                    };
                }

                if (operator === 'equals') {
                    op = { equals: value, mode: 'insensitive' }; // Case insensitive for standard fields
                } else if (operator === 'contains' && typeof value === 'string') {
                    op = { contains: value, mode: 'insensitive' };
                } else if (operator === 'gt') {
                    op = { gt: Number(value) };
                } else if (operator === 'lt') {
                    op = { lt: Number(value) };
                } else if (operator === 'isSet') {
                    if (isStandardField) {
                        op = {
                            AND: [
                                { not: null },
                                { not: '' }
                            ]
                        };
                    } else {
                        op = { not: Prisma.JsonNull };
                    }
                } else if (operator === 'isNotSet') {
                    if (isStandardField) {
                        op = {
                            OR: [
                                { equals: null },
                                { equals: '' }
                            ]
                        };
                    } else {
                        op = { equals: Prisma.JsonNull };
                    }
                }

                if (isStandardField) {
                    // Standard Field Filter (Top Level)
                    // If we are filtering by name, email or phone directly on the columns
                    // We return a special marker to be hoisted up or we structure it differently.
                    // Since map returns one object, we can't easily hoist it out of this array map structure 
                    // if we strictly follow the current "jsonFilters" array approach which puts everything in AND.
                    // HOWEVER, we can just return the prisma where clause piece.

                    // NOTE: The current code puts the result of this map into `jsonFilters`.
                    // We need to return a structure that can be distinguished or change the logic before mapping.

                    // Let's return the simplified object and filter/hoist later or 
                    // better yet, just return the where clause object.
                    return {
                        [lowerField]: op
                    };
                } else {
                    // JSON Custom Field Filter
                    // Re-map operators for JSON without 'mode' if strict JSON
                    let jsonOp: any = {};
                    if (operator === 'equals') jsonOp = { equals: value }; // JSON equals is usually case-sensitive strings or direct numbers
                    else if (operator === 'contains') jsonOp = { string_contains: value }; // Prisma specialized JSON filter
                    else if (operator === 'gt') jsonOp = { gt: Number(value) };
                    else if (operator === 'lt') jsonOp = { lt: Number(value) };
                    else if (operator === 'isSet') jsonOp = { not: Prisma.JsonNull };
                    else if (operator === 'isNotSet') jsonOp = { equals: Prisma.JsonNull };

                    return {
                        customData: {
                            path: [field],
                            ...jsonOp
                        }
                    };
                }
            });

            if (jsonFilters.length > 0) {
                // If there were any filters, add them to AND
                // Note: jsonFilters now contains both standard field objects { name: ... } and customData objects { customData: ... }
                // Prisma AND accepts an array of where clauses, so this works perfectly for both!
                where.AND = jsonFilters;
            }

            if (jsonFilters.length > 0) {
                where.AND = jsonFilters;
            }
        }

        const [contacts, total] = await Promise.all([
            prisma.contact.findMany({
                where,
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: { conversations: true }
                    }
                }
            }),
            prisma.contact.count({ where })
        ]);

        return {
            contacts,
            total,
            totalPages: Math.ceil(total / pageSize),
            currentPage: page
        };
    } catch (error) {
        console.error('Error fetching contacts:', error);
        throw new Error('Failed to fetch contacts');
    }
}

// Debug Logger Helper
async function logDebug(message: string, data?: any) {
    const fs = await import('fs');
    const path = await import('path');
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message} ${data ? JSON.stringify(data) : ''}\n`;
    const logPath = '/tmp/chatbot-debug.log'; // Use tmp to avoid permission/cwd issues
    try {
        await fs.promises.appendFile(logPath, logLine);
    } catch (e) {
        // console.error("Failed to write to debug log", e);
    }
}

export async function updateContact(contactId: string, updates: Record<string, any>, workspaceId: string) {
    await logDebug('updateContact called', { contactId, updates, workspaceId });
    try {
        // 1. Fetch contact to verify existence and get current data
        const contact = await prisma.contact.findUnique({
            where: { id: contactId }
        });

        if (!contact) {
            await logDebug('Contact not found', { contactId });
            throw new Error('Contact not found');
        }

        // 2. Fetch custom fields definitions to validate
        const agents = await prisma.agent.findMany({
            where: { workspaceId },
            include: {
                customFieldDefinitions: true
            }
        });

        if (agents.length === 0) {
            await logDebug('No agents found for workspace', { workspaceId });
        }

        // Flatten all available fields in the workspace
        const allFields = agents.flatMap(a => a.customFieldDefinitions);
        const validKeys = new Set(allFields.map(f => f.key)); // Assuming keys in DB are case-sensitive but usually lowercase

        // Debug: Log valid keys
        await logDebug('Valid keys found', Array.from(validKeys));

        // 3. Filter updates
        const filteredUpdates: Record<string, any> = {};
        const standardUpdates: Record<string, any> = {};
        const standardFields = ['name', 'email', 'phone'];

        for (const [key, value] of Object.entries(updates)) {
            const lowerKey = key.toLowerCase();
            // Handle Standard Fields
            if (standardFields.includes(lowerKey)) {
                standardUpdates[lowerKey] = value;
            }
            // Handle Custom Fields (Robust Check)
            // convert validKeys to lowercase for comparison if needed, or rely on widget normalization
            else if (validKeys.has(key) || validKeys.has(lowerKey)) {
                // Prefer the exact key from validKeys if match found
                const exactKey = validKeys.has(key) ? key : lowerKey;
                filteredUpdates[exactKey] = value;
            } else {
                await logDebug('Dropping invalid key', { key, value, validKeys: Array.from(validKeys) });
            }
        }

        await logDebug('Prepared updates', { standardUpdates, filteredUpdates });

        // 4. Merge with existing data
        const currentData = (contact.customData as Record<string, any>) || {};
        const newData = { ...currentData, ...filteredUpdates };

        const updatedContact = await prisma.contact.update({
            where: { id: contactId },
            data: {
                customData: newData,
                ...standardUpdates
            }
        });

        await logDebug('Contact updated successfully', { id: updatedContact.id, name: updatedContact.name, customData: updatedContact.customData });

        return { success: true, contact: updatedContact };
    } catch (error) {
        await logDebug('Error updating contact', error);
        console.error('Error updating contact:', error);
        return { success: false, error: 'Failed to update contact' };
    }
}
