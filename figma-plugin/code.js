// Falcon Asset Manager - Figma 2-Way Sync Plugin
figma.showUI(__html__, { width: 340, height: 480 });

function logToUI(message, logType = 'info') {
  figma.ui.postMessage({ type: 'log', message, logType });
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'sync-variables') {
    try {
      logToUI('Syncing variable collections...');
      const tokens = msg.tokens;
      if (!tokens || !tokens.colors) {
        throw new Error('Invalid design tokens format');
      }

      // Check for existing collection
      let collection = (await figma.variables.getLocalVariableCollectionsAsync())
        .find(c => c.name === 'Falcon UI System');
      
      if (!collection) {
        collection = figma.variables.createVariableCollection('Falcon UI System');
      }

      const modeId = collection.modes[0].modeId;
      logToUI(`Creating color variables under collection "${collection.name}"...`);

      // Helper to parse hex
      const parseHex = (hex) => {
        const cleaned = hex.replace('#', '');
        return {
          r: parseInt(cleaned.substring(0, 2), 16) / 255,
          g: parseInt(cleaned.substring(2, 4), 16) / 255,
          b: parseInt(cleaned.substring(4, 6), 16) / 255,
        };
      };

      for (const [name, hex] of Object.entries(tokens.colors)) {
        let variable = (await figma.variables.getLocalVariablesAsync())
          .find(v => v.name === name && v.variableCollectionId === collection.id);
        
        if (!variable) {
          variable = figma.variables.createVariable(name, collection, 'COLOR');
        }
        
        variable.setValueForMode(modeId, parseHex(hex));
      }

      logToUI('Variable sync complete! Refreshing canvas styles...', 'success');
    } catch (err) {
      logToUI(`Sync variables error: ${err.message}`, 'error');
    }
  }

  if (msg.type === 'import-views') {
    try {
      logToUI('Preparing layout engine...');
      const { structure, tokens } = msg;

      // Load fonts
      logToUI('Loading font Inter...');
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
      await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' });
      await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });

      // Create variable collection if not exists, or get it
      let collection = (await figma.variables.getLocalVariableCollectionsAsync())
        .find(c => c.name === 'Falcon UI System');
      
      if (!collection) {
        collection = figma.variables.createVariableCollection('Falcon UI System');
        // Seed colors
        const modeId = collection.modes[0].modeId;
        const parseHex = (hex) => {
          const cleaned = hex.replace('#', '');
          return {
            r: parseInt(cleaned.substring(0, 2), 16) / 255,
            g: parseInt(cleaned.substring(2, 4), 16) / 255,
            b: parseInt(cleaned.substring(4, 6), 16) / 255,
          };
        };
        for (const [name, hex] of Object.entries(tokens.colors)) {
          const variable = figma.variables.createVariable(name, collection, 'COLOR');
          variable.setValueForMode(modeId, parseHex(hex));
        }
      }

      const localVariables = await figma.variables.getLocalVariablesAsync();
      const variableMap = {};
      localVariables.forEach(v => {
        if (v.variableCollectionId === collection.id) {
          variableMap[v.name] = v;
        }
      });

      // Clear existing page children to draw fresh
      const page = figma.currentPage;
      logToUI(`Clearing current page "${page.name}" before redraw...`);
      page.children.forEach(c => c.remove());

      let currentX = 0;

      // Recursive renderer
      async function drawNode(data, parent) {
        let node;
        
        if (data.type === 'TEXT') {
          node = figma.createText();
          node.name = data.name || 'Text';
          node.fontName = {
            family: 'Inter',
            style: data.fontWeight || 'Regular'
          };
          node.fontSize = data.fontSize || 12;
          node.characters = data.text || '';
          
          if (data.color && variableMap[data.color]) {
            node.fills = [figma.variables.setBoundVariableForPaint(
              { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
              'color',
              variableMap[data.color]
            )];
          } else if (data.colorHex) {
            const clean = data.colorHex.replace('#', '');
            node.fills = [{
              type: 'SOLID',
              color: {
                r: parseInt(clean.substring(0, 2), 16) / 255,
                g: parseInt(clean.substring(2, 4), 16) / 255,
                b: parseInt(clean.substring(4, 6), 16) / 255
              }
            }];
          }
        } else {
          // Default to FRAME (containers)
          node = figma.createFrame();
          node.name = data.name || 'Container';
          node.resize(data.width || 100, data.height || 100);

          // Apply Auto Layout
          if (data.layoutMode) {
            node.layoutMode = data.layoutMode; // 'HORIZONTAL' or 'VERTICAL'
            node.itemSpacing = data.gap || 0;
            
            const padding = data.padding || [0, 0, 0, 0]; // [top, right, bottom, left] or [y, x]
            if (padding.length === 2) {
              node.paddingTop = padding[0];
              node.paddingBottom = padding[0];
              node.paddingLeft = padding[1];
              node.paddingRight = padding[1];
            } else if (padding.length === 4) {
              node.paddingTop = padding[0];
              node.paddingRight = padding[1];
              node.paddingBottom = padding[2];
              node.paddingLeft = padding[3];
            }
          }

          // Fills / background
          if (data.fill && variableMap[data.fill]) {
            node.fills = [figma.variables.setBoundVariableForPaint(
              { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
              'color',
              variableMap[data.fill]
            )];
          } else if (data.fillHex) {
            const clean = data.fillHex.replace('#', '');
            node.fills = [{
              type: 'SOLID',
              color: {
                r: parseInt(clean.substring(0, 2), 16) / 255,
                g: parseInt(clean.substring(2, 4), 16) / 255,
                b: parseInt(clean.substring(4, 6), 16) / 255
              }
            }];
          } else {
            node.fills = []; // Transparent frame
          }

          // Border / Strokes
          if (data.stroke && variableMap[data.stroke]) {
            node.strokes = [figma.variables.setBoundVariableForPaint(
              { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
              'color',
              variableMap[data.stroke]
            )];
            node.strokeWeight = data.strokeWeight || 1;
          } else if (data.strokeHex) {
            const clean = data.strokeHex.replace('#', '');
            node.strokes = [{
              type: 'SOLID',
              color: {
                r: parseInt(clean.substring(0, 2), 16) / 255,
                g: parseInt(clean.substring(2, 4), 16) / 255,
                b: parseInt(clean.substring(4, 6), 16) / 255
              }
            }];
            node.strokeWeight = data.strokeWeight || 1;
          }

          // Corner radius
          if (data.borderRadius !== undefined) {
            node.cornerRadius = data.borderRadius;
          }

          // Fixed width/height vs fill container
          if (parent && parent.layoutMode) {
            if (data.layoutGrow !== undefined) {
              node.layoutGrow = data.layoutGrow;
            }
            if (data.layoutAlign !== undefined) {
              node.layoutAlign = data.layoutAlign; // 'STRETCH' or 'INHERIT'
            }
          }

          // Render children recursively
          if (data.children) {
            for (const childData of data.children) {
              await drawNode(childData, node);
            }
          }
        }

        if (parent) {
          parent.appendChild(node);
        } else {
          page.appendChild(node);
        }

        return node;
      }

      for (const view of structure) {
        logToUI(`Drawing page frame "${view.name}"...`);
        const rootNode = await drawNode(view, null);
        rootNode.x = currentX;
        rootNode.y = 0;
        currentX += view.width + 100; // Gap between pages
      }

      figma.viewport.scrollAndZoomIntoView(page.children);
      logToUI('Drawing complete! All views, auto layouts and tokens applied.', 'success');
    } catch (err) {
      logToUI(`Draw error: ${err.message}`, 'error');
    }
  }

  if (msg.type === 'get-selected-frame') {
    try {
      const selection = figma.currentPage.selection;
      if (selection.length !== 1 || selection[0].type !== 'FRAME') {
        throw new Error('Please select exactly one Frame node on the canvas.');
      }

      const frame = selection[0];
      logToUI(`Serializing selected frame "${frame.name}"...`);

      // Local variable map to resolve bound colors back to their names
      let collection = (await figma.variables.getLocalVariableCollectionsAsync())
        .find(c => c.name === 'Falcon UI System');
      const varIdToNameMap = {};
      if (collection) {
        const localVariables = await figma.variables.getLocalVariablesAsync();
        localVariables.forEach(v => {
          if (v.variableCollectionId === collection.id) {
            varIdToNameMap[v.id] = v.name;
          }
        });
      }

      // Serialize node structure recursively
      function serializeNode(node) {
        const data = {
          name: node.name,
          type: node.type,
          width: node.width,
          height: node.height,
        };

        if (node.type === 'TEXT') {
          data.text = node.characters;
          data.fontSize = node.fontSize;
          data.fontWeight = node.fontName.style;
          
          // Color binding
          if (node.fills && node.fills.length > 0 && node.fills[0].type === 'SOLID') {
            const bound = node.fills[0].boundVariables;
            if (bound && bound.color && varIdToNameMap[bound.color.id]) {
              data.color = varIdToNameMap[bound.color.id];
            } else {
              const color = node.fills[0].color;
              data.colorHex = '#' + [color.r, color.g, color.b]
                .map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
            }
          }
        } else if (node.type === 'FRAME') {
          // Auto Layout
          if (node.layoutMode && node.layoutMode !== 'NONE') {
            data.layoutMode = node.layoutMode;
            data.gap = node.itemSpacing;
            data.padding = [
              node.paddingTop,
              node.paddingRight,
              node.paddingBottom,
              node.paddingLeft
            ];
          }

          // Fills
          if (node.fills && node.fills.length > 0 && node.fills[0].type === 'SOLID') {
            const bound = node.fills[0].boundVariables;
            if (bound && bound.color && varIdToNameMap[bound.color.id]) {
              data.fill = varIdToNameMap[bound.color.id];
            } else {
              const color = node.fills[0].color;
              data.fillHex = '#' + [color.r, color.g, color.b]
                .map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
            }
          }

          // Border / Stroke
          if (node.strokes && node.strokes.length > 0 && node.strokes[0].type === 'SOLID') {
            const bound = node.strokes[0].boundVariables;
            if (bound && bound.color && varIdToNameMap[bound.color.id]) {
              data.stroke = varIdToNameMap[bound.color.id];
            } else {
              const color = node.strokes[0].color;
              data.strokeHex = '#' + [color.r, color.g, color.b]
                .map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
            }
            data.strokeWeight = node.strokeWeight;
          }

          if (node.cornerRadius !== undefined && node.cornerRadius !== figma.mixed) {
            data.borderRadius = node.cornerRadius;
          }

          // Children
          if (node.children && node.children.length > 0) {
            data.children = node.children.map(serializeNode);
          }
        }

        return data;
      }

      const serializedLayout = serializeNode(frame);
      figma.ui.postMessage({
        type: 'export-frame-data',
        frameName: frame.name,
        layout: serializedLayout
      });

    } catch (err) {
      logToUI(`Export selection error: ${err.message}`, 'error');
    }
  }
};
