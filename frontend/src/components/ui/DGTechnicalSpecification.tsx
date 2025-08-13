import React from 'react';

interface DGTechnicalSpecificationProps {
  kva: string;
  phase: string;
  engineModel: string;
  alternatorModel: string;
  emissionCompliance: string;
}

const DGTechnicalSpecification: React.FC<DGTechnicalSpecificationProps> = ({
  kva,
  phase,
  engineModel,
  alternatorModel,
  emissionCompliance
}) => {
  return (
    <div className="bg-white p-8 max-w-4xl mx-auto shadow-lg">
      {/* Header with Logos */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center">
          <div className="text-red-600 font-bold text-2xl italic">powerol</div>
          <div className="text-sm text-gray-600 ml-2">by Mahindra</div>
        </div>
        <div className="text-right">
          <div className="text-red-600 font-bold text-xl italic">Sun Power Services</div>
        </div>
      </div>

      <div className="border-t-2 border-red-600 mb-6"></div>

      {/* Main Title */}
      <div className="text-center font-bold text-lg mb-8 bg-yellow-200 p-2 rounded">
        Technical Specification of {kva} & {kva} KVA({phase}P) DG (Auto ON/OFF) – (Drop Down Option required)
      </div>

      {/* Section A - Diesel Engine */}
      <div className="mb-6">
        <h3 className="font-bold underline text-lg mb-3">A - Diesel Engine:</h3>
        <div className="text-sm leading-relaxed">
          <p className="mb-2">
            Mahindra - make Engines Water cooled radiator type, 4 strokes, 4 cylinders Inline suitable for generating set application
          </p>
          <p className="mb-2">
            Engine confirms to as per ISO 3046 / BS 5514 Standards.
          </p>
          <p className="mb-2">
            <span className="bg-yellow-200 px-1">4 strokes</span> and <span className="bg-yellow-200 px-1">4 cylinders</span> configuration
          </p>
        </div>
      </div>

      {/* Section B - Alternator */}
      <div className="mb-6">
        <h3 className="font-bold underline text-lg mb-3">B - Alternator:</h3>
        <div className="text-sm leading-relaxed">
          <p className="mb-2">
            {alternatorModel.toUpperCase()} rated at @ 1500 RPM, <span className="bg-yellow-200 px-1">415 V</span>, 50 Hz, 0.8 PF, <span className="bg-yellow-200 px-1">3 phase</span> star connected, IP 23 Enclosure, brushless Alternator with AVR, Class "H" insulation. Single bearing alternator suitable for close coupling, the alternator shall confirm to IS: 4722
          </p>
        </div>
      </div>

      {/* Section C - Acoustic Enclosure */}
      <div className="mb-6">
        <h3 className="font-bold underline text-lg mb-3">C - Acoustic Enclosure:</h3>
        <div className="text-sm leading-relaxed">
          <p className="mb-4">
            Acoustic Enclosure is fabricated with CRCA sheet of 16 SWG. Modular construction with lifting arrangement integral part of the enclosure, provision made to assemble & dismantle easily as per site condition. No Parts extend beyond Acoustic Enclosure.
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Provision made for fuel filling and fuel level is indicator with fuel gauge.</li>
            <li>Doors are provided with high quality EPDM gaskets to avoid leakage of sound, Door handles with locks.</li>
            <li>Sound Proof enclosure by high quality mineral wool / Rock wool of 50 mm thickness.</li>
            <li>Specially designed attenuators are provided to minimize the noise levels from hot air outlet. Adequate space provided for maintenance and service access.</li>
          </ul>
        </div>
      </div>

      {/* Additional Specifications */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold mb-3">Additional Specifications:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Emission Compliance:</strong> {emissionCompliance}
          </div>
          <div>
            <strong>Engine Model:</strong> {engineModel}
          </div>
          <div>
            <strong>Power Rating:</strong> {kva} KVA
          </div>
          <div>
            <strong>Phase:</strong> {phase} Phase
          </div>
        </div>
      </div>
    </div>
  );
};

export default DGTechnicalSpecification; 