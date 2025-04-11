#!/usr/bin/env node
import { MapsServer } from './mapsserver.js';

const server = new MapsServer();
server.run().catch(console.error);